var library = require("nrtv-library")(require)

var exports = library.export(
  "minion-server",
  function() {

    SingleUseSocket.getReady()

    function sendPortal(request, response) {
      library.using(["minion-portal"], 
        function(portal) {
          portal(request, response)
        }
      )
    }

    server.get(
      "/minions",
      sendPortal
    )

    function resetAndStart() {
      library.using(
        ["minion-queue", library.reset("nrtv-server")],
        start
      )
    }

    var startedServer

    function start(MinionQueue, server) {

      var queue = new MinionQueue()

      server.post("/tasks",
        function(request, response) {
          var task = request.body
          task.report = function(message) {
            response.send(message)
          }
          queue.addTask(task)
        }
      )

      server.start(9777)

      startedServer = server
    }

    function stop() {
      startedServer.stop()
    }

    return {
      start: resetAndStart,
      stop: stop,
      getPort: function() {
        return 9777
      }
    }
  }
)