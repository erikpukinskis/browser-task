var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-portal",
  [
    "nrtv-single-use-socket",
    "nrtv-browser-bridge",
    "./client"
  ],
  function(SingleUseSocket, bridge, buildClient) {

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

      bridge.sendPage(
        buildClient(socket)
      )(request, response)
    }

    return handleRequest
  }
)