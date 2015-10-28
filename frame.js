var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-frame",
  [
    "nrtv-single-use-socket",
    "nrtv-element"
  ],
  function(SingleUseSocket, element) {

    function buildFrame(bridge, queue) {

      var socket = new SingleUseSocket()

      var _this = this


      // Requesting work

      socket.listen(
        function(message) {
          if (message == "can i haz work?") {
            queue.requestWork(sendAJob)
          } else {
            socket.assignedTask.callback(message)
          }
        }
      )

      bridge.asap(
        socket.defineSendInBrowser().withArgs("can i haz work?")
      )


      // Sending work

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

      var doWork = bridge.defineFunction(
        [socket.defineSendInBrowser()],
        function doWork(sendSocketMessage, data) {

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

      bridge.asap(
        socket
        .defineListenInBrowser()
        .withArgs(doWork)
      )


      return element("iframe.sansa")
    }

    return buildFrame
  }
)