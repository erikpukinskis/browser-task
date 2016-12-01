var library = require("module-library")(require)

// rename workspace?

module.exports = library.export(
  "minion-frame",
  [
    "nrtv-single-use-socket",
    "web-element",
    "nrtv-wait"
  ],
  function(SingleUseSocket, element, wait) {

    function buildFrame(bridge, requestWork, id) {

      var socket = new SingleUseSocket()

      var _this = this

      // Requesting work

      socket.listen(
        function(response) {
          if (response != "undefined") {
            var object = JSON.parse(response)

            var report = object.__nrtvMinionMessage || object

            var isWorkRequest = object.__nrtvWorkRequest
          }

          if (isWorkRequest) {
            requestWork(sendAJob, id)
          } else {
            socket.assignedTask.callback(report)
          }
        }
      )

      bridge.asap(
        bridge.defineFunction(
          function markMyself(id) {
            document.isOutsideNrtvMinionIframe = true
            document.cookie = "nrtvMinionId="+id
          }
        ).withArgs(id)
      )

      var workRequest = JSON.stringify({__nrtvWorkRequest: "can i haz work?"})

      bridge.asap(socket.defineSendOn(bridge).withArgs(workRequest))


      // Sending work

      function sendAJob(task) {
        console.log("\n______\nMINION on "+socket.identifier+" is getting work:\n")

        if (!task.funcSource) {
          task.funcSource = task.func.toString()
        }

        var message = JSON.stringify({
          source: task.funcSource,
          args: task.args || []
        })

        socket.send(message)

        socket.assignedTask = task
      }

      var doWork = bridge.defineFunction(
        [
          socket.defineSendOn(bridge),
          wait.defineOn(bridge)],
        function doWork(sendSocketMessage, wait, data) {

          task = JSON.parse(data)

          var iframe = document.querySelector(".sansa")

          function readyDocument(callback) {
            wait.forIframe(iframe, callback)
          }

          var minion = {
            browse: function(url, callback) {
              iframe.src = url
              iframe.onload = readyDocument.bind(null, callback)
            },
            report: function(object) {
              if (typeof object == "string") {
                var message = object
                object = {
                  __nrtvMinionMessage: message
                }
              }

              sendSocketMessage(JSON.stringify(object))
            },
            wait: wait
          }      

          var func = eval("f="+task.source)

          task.args.push(minion)
          task.args.push(iframe)

          func.apply(null, task.args)
        }
      )


      bridge.asap(
        socket
        .defineListenOn(bridge)
        .withArgs(doWork)
      )

      return element("iframe.sansa")
    }

    return buildFrame
  }
)