var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-portal",
  [
    "nrtv-single-use-socket",
    "nrtv-browser-bridge",
    "nrtv-element"
  ],
  function(SingleUseSocket, bridge, element) {

    function handleRequest(request, response, queue) {

      var socket = new SingleUseSocket()

      var _this = this

      socket.listen(
        function(message) {
          if (message == "can i haz work?") {
            queue.requestWork(sendAJob)
          } else {
            socket.assignedTask.callback(message)
          }
        }
      )

      function sendAJob(task) {

        if (!task.funcSource) {
          task.funcSource = task.func.toString()
        }

        socket.send(
          JSON.stringify({
            source: task.funcSource,
            args: task.args || []
          })
        )

        socket.assignedTask = task
      }

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

      bridge.sendPage(iframe)(request, response)
    }

    return handleRequest
  }
)