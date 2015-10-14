var library = require("nrtv-library")(require)


module.exports = library.export(
  "minions",
  ["nrtv-element", "nrtv-browser-bridge", "nrtv-server", "nrtv-single-use-socket"],
  function(element, bridge, server, SingleUseSocket) {

    function MinionQueue() {
      var tasks = this.tasks = {}

      var connected = {}

      var iframe = element("iframe.sansa")

      var notifyServerWeAreDone = bridge.defineFunction(function done() {
        console.log("notif!")
      })

      var sockets = {}

      SingleUseSocket.getReady()

      var giveMinionWork = bridge.defineFunction(
        [],
        function giveMinionWork(source) {

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
            report: function(data) {
              console.log("reporting", data)
            }
          }      

          var func = eval("f="+source)

          func(minion, iframe)

        }
      )

      server.get("/minions",
        function(request, response) {

          var socket = new SingleUseSocket()

          sockets[socket.identifier] = socket

          var acceptWorkMinion = socket
            .defineListenInBrowser()
            .withArgs(giveMinionWork)

          var requestWorkMinion = socket.defineSendInBrowser()

          bridge.asap(acceptWorkMinion)
          bridge.asap(requestWorkMinion)

          socket.listen(
            function() {
              var ids = Object.keys(tasks)
              var jobCount = ids.length

              if (jobCount > 0) {
                var id = ids.pop()
                socket.send(tasks[id])
              }
            }
          )

          bridge.sendPage([
            buildTaskButtons(), iframe
          ])(request, response)
        }
      )

      
      function buildTaskButtons() {
        var taskButtons = []
        for (name in tasks) {
          taskButtons.push(taskButton(tasks[name], name))
        }

        return taskButtons
      }

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

    }

    MinionQueue.prototype.addTask =
      function(name, func) {
        this.tasks[name] = func
      }

    return MinionQueue
  }
)