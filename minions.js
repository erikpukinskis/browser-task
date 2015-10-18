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
            socket.send(tasks[id].func)
            socket.assignedTask = tasks[id]
          } else {
            throw Error("no jobs!")
          }
        }

        bridge.sendPage(
          buildClient(socket, this.tasks)
        )(request, response)

      }
    }


    MinionQueue.prototype.addTask =
      function(name, func, report) {
        this.tasks[name] = new MinionTask(name, func, report)
      }

    return MinionQueue
  }
)

function MinionTask(name, func, report) {
  this.name = name
  this.func = func
  this.report = report
}



library.define(
  "minion-client",
  ["nrtv-browser-bridge", "nrtv-element"],
  function(bridge, element) {

    return function(socket, tasks) {

      var giveMinionWork = bridge.defineFunction(
        [socket.defineSendInBrowser()],
        function giveMinionWork(sendSocketMessage, source) {

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

          var func = eval("f="+source)

          func(minion, iframe)
        }
      )

      function taskButton(func, name) {
        var binding = bridge.defineFunction(func)

        var button = element(
          "button",
          {
            onclick: giveMinionWork.withArgs(binding).evalable()
          },
          element.raw(name)
        )

        return button
      }

      var iframe = element("iframe.sansa")

      var acceptWorkMinion = socket
        .defineListenInBrowser()
        .withArgs(giveMinionWork)

      var requestWorkMinion = socket.defineSendInBrowser().withArgs("can i haz work?")

      bridge.asap(acceptWorkMinion)
      bridge.asap(requestWorkMinion)

      var taskButtons = []
      for (name in tasks) {
        taskButtons.push(taskButton(tasks[name].func, name))
      }

      return [taskButtons, iframe]
    }
  }
)