var library = require("nrtv-library")(require)


module.exports = library.export(
  "minions",
  ["nrtv-browser-bridge", "nrtv-server", "nrtv-single-use-socket"],
  function(bridge, server, SingleUseSocket) {

    function MinionQueue() {
      this.tasks = {}
      this.sockets = {}

      SingleUseSocket.getReady()

      server.get(
        "/minions",
        this.sendPage.bind(this)
      )
    }

    MinionQueue.prototype.sendPage =
      function(request, response) {

      library.using(
        ["nrtv-single-use-socket",library.reset("nrtv-browser-bridge"), "minion-client"],
        makeSocketAndSendPage.bind(this)
      )

      function makeSocketAndSendPage(SingleUseSocket, bridge, buildClient) {

        var socket = new SingleUseSocket()

        var tasks = this.tasks

        this.sockets[socket.identifier] = socket

        socket.listen(
          function(message) {
            if (message == "can i haz work?") {
              sendAJob()
            } else {
              socket.assignedTask.report(message)
            }
          }
        )

        function sendAJob() {
          var ids = Object.keys(tasks)
          var jobCount = ids.length

          if (jobCount > 0) {
            var id = ids.pop()
            var task = tasks[id]
            socket.send(
              JSON.stringify({
                source: task.func.toString(),
                args: task.args || []
              })
            )

            socket.assignedTask = task
          } else {
            throw Error("no jobs!")
          }
        }

        bridge.sendPage(
          buildClient(socket, this.tasks)
        )(request, response)

      }
    }

    function argsToTask(args) {
      for(var i=0; i<args.length; i++) {
        var arg = args[i]

        if (typeof arg == "function" && !func) {
          var func = arg
        } else if (typeof arg == "function") {
          var report = arg
        } else if (typeof arg == "string") {
          var name = arg
        } else if (Array.isArray(arg)) {
          var args = arg
        } else {
          throw new Error("Passed "+arg+" to minions.addTask, but we don't know what to do with that. You can provide a function with the work to do, an optional second function to report back to, a name, and an array of arguments to pass to the minion.")
        }
      }

      return {
        func: func,
        report: report,
        name: name,
        args: args
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
  "minion-client",
  ["nrtv-browser-bridge", "nrtv-element"],
  function(bridge, element) {

    return function(socket, tasks) {

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