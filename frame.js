var library = require("nrtv-library")(require)

// rename workspace?

module.exports = library.export(
  "minion-frame",
  [
    "nrtv-single-use-socket",
    "nrtv-element"
  ],
  function(SingleUseSocket, element) {

    function buildFrame(bridge, requestWork, id) {

      var socket = new SingleUseSocket()

      var _this = this

      // Requesting work

      socket.listen(
        function(response) {
          var object = JSON.parse(response)

          var report = object.__nrtvMinionMessage || object

          var isWorkRequest = object.__nrtvWorkRequest

          if (isWorkRequest) {
            requestWork(sendAJob, id)
          } else {
            socket.assignedTask.callback(report)
          }
        }
      )

      bridge.asap(
        socket.defineSendInBrowser().withArgs(JSON.stringify({__nrtvWorkRequest: "can i haz work?"}))
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

          task = JSON.parse(data)

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
            report: function(object) {
              if (typeof object == "string") {
                var message = object
                object = {
                  __nrtvMinionMessage: message
                }
              }
              sendSocketMessage(JSON.stringify(object))
            }
          }      

          var func = eval("f="+task.source)

          task.args.push(minion)
          task.args.push(iframe)

          func.apply(null, task.args)
        }
      )

      bridge.asap(
        socket
        .defineListenInBrowser()
        .withArgs(doWork)
      )

      bridge.asap(
        bridge.defineFunction(
          function markMyself(id) {
            document.cookie = "nrtvMinionId="+id
          }
        ).withArgs(id)
      )


      return element("iframe.sansa")
    }

    return buildFrame
  }
)