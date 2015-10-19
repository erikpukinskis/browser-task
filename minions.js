var library = require("nrtv-library")(require)

library.define(
  "minion-queue",
  ["nrtv-browser-bridge", "nrtv-server", "nrtv-single-use-socket"],
  function(bridge, server, SingleUseSocket) {

    function MinionQueue() {
      this.tasks = {}
      this.sockets = {}

      SingleUseSocket.getReady()

      server.get(
        "/minions",
        this._sendPage.bind(this)
      )
    }

    MinionQueue.prototype._sendPage =
      function(request, response) {

      library.using(
        ["nrtv-single-use-socket",library.reset("nrtv-browser-bridge"), "minion-client"],
        makeSocketAndSendPage.bind(this)
      )

      function makeSocketAndSendPage(SingleUseSocket, bridge, buildClient) {

        var socket = new SingleUseSocket()

        this.sockets[socket.identifier] = socket

        var _this = this

        socket.listen(
          function(message) {
            if (message == "can i haz work?") {
              _this._requestWork(sendAJob)
            } else {
              socket.assignedTask.report(message)
            }
          }
        )

        var _this = this

        function sendAJob(task) {

          var source = task.funcSource || task.func.toString()

          socket.send(
            JSON.stringify({
              source: source,
              args: task.args || []
            })
          )

          socket.assignedTask = task

        }

        bridge.sendPage(
          buildClient(socket)
        )(request, response)

      }
    }

    MinionQueue.prototype._requestWork =
      function(callback) {
        var ids = Object.keys(this.tasks)
        var jobCount = ids.length

        if (jobCount > 0) {
          var id = ids.pop()
          var task = this.tasks[id]
          callback(task)
        }
      }

    MinionQueue.prototype.addTask =
      function() {
        this.tasks[name] = argsToTask(arguments)
      }

    return MinionQueue
  }
)


library.define(
  "minion-delegator",
  function() {
    function resetAndStart() {
      library.using(
        ["minion-queue", library.reset("nrtv-server")],
        start
      )
    }

    var startedServer

    function start(MinionQueue, server) {

      var queue = new MinionQueue()

      server.post("/tasks",
        function(request, response) {
          var task = request.body
          task.report = function(message) {
            response.send(message)
          }
          queue.addTask(task)
        }
      )

      server.start(9777)

      startedServer = server
    }

    function stop() {
      startedServer.stop()
    }

    return {
      start: resetAndStart,
      stop: stop,
      getPort: function() {
        return 9777
      }
    }
  }
)


library.define(
  "minion-api-client",
  ["request"],
  function(request) {

    function addTask() {
      var task = argsToTask(arguments)

      var data = {
        funcSource: task.func.toString()
      }
      if (task.args) {
        data.args = args
      }
      var body = JSON.stringify(data)

      request.post({
        url: "http://localhost:9777/tasks",
        method: "POST",
        json: true,
        headers: {"content-type": "application/json"},
        body: data
      }, function(error, response) {
        if (error) { throw error }
        if (task.report) {
          task.report(response.body)
        }
      })
    }

    return {
      addTask: addTask
    }
  }
)


library.define(
  "minion-client",
  ["nrtv-browser-bridge", "nrtv-element"],
  function(bridge, element) {

    return function(socket) {

      var giveMinionWork = bridge.defineFunction(
        [socket.defineSendInBrowser()],
        function giveMinionWork(sendSocketMessage, data) {

          data = JSON.parse(data)

          var iframe = document.querySelector(".sansa")

          var minion = {
            browse: function(url, callback) {
              iframe.src = url
              iframe.onload = callback
            },
            press: function(selector) {
              var element = iframe.contentDocument.querySelector(selector)
              element.click()
            },
            report: function(message) {
              sendSocketMessage(message)
            }
          }      

          var func = eval("f="+data.source)

          data.args.push(minion)
          data.args.push(iframe)

          func.apply(null, data.args)
        }
      )

      var iframe = element("iframe.sansa")

      var acceptWorkMinion = socket
        .defineListenInBrowser()
        .withArgs(giveMinionWork)

      var requestWorkMinion = socket.defineSendInBrowser().withArgs("can i haz work?")

      bridge.asap(acceptWorkMinion)
      bridge.asap(requestWorkMinion)

      return iframe
    }
  }
)


function argsToTask(args) {
  if (typeof args[0] == "object") {
    return args[0]
  }

  for(var i=0; i<args.length; i++) {
    var arg = args[i]

    if (typeof arg == "function" && !func) {
      var func = arg
    } else if (typeof arg == "function") {
      var report = arg
    } else if (typeof arg == "string") {
      var name = arg
    } else if (Array.isArray(arg)) {
      var taskArgs = arg
    } else {
      throw new Error("Passed "+arg+" to minions.addTask, but we don't know what to do with that. You can provide a function with the work to do, an optional second function to report back to, a name, and an array of arguments to pass to the minion.")
    }
  }

  return {
    func: func,
    report: report,
    name: name,
    args: taskArgs
  }
}


module.exports = library.export(
  "minions",
  ["minion-queue", "minion-delegator", "minion-api-client"],
  function(queue, delegator, api) {
    return {
      queue: queue,
      delegator: delegator,
      api: api
    }
  }
)
