var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-server",
  ["nrtv-single-use-socket", "nrtv-server", "./dispatcher"],
  function(SingleUseSocket, server, Dispatcher) {

    var startedServer

    function start(port, queue) {

      if (!queue) {
        queue = new Dispatcher()
      }

      SingleUseSocket.getReady()

      server.get(
        "/minions",
        function(request, response) {

          library.using(["./portal"], 
            function(portal) {
              portal(request, response, queue)
            }
          )

        }
      )


      server.post("/tasks",
        function(request, response) {
          var task = request.body
          task.callback = function(message) {
            response.send(message)
          }
          queue.addTask(task)
        }
      )

      server.start(port || 9777)

      startedServer = server
    }

    function stop() {
      startedServer.stop()
    }

    return {
      start: start,
      stop: stop,
      getPort: function() {
        return startedServer.port
      }
    }
  }
)