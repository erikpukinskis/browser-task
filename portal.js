var library = require("nrtv-library")(require)

var exports = library.export(
  "minion-portal",
  [
    "nrtv-single-use-socket",
    library.reset(
      "nrtv-browser-bridge"
    ),
    "minion-client"
  ],
  function(SingleUseSocket, bridge, buildClient) {

    function handleRequest(request, response) {

      var socket = new SingleUseSocket()

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

    return handleRequest
  }
)