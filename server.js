var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-server",
  ["nrtv-single-use-socket", "nrtv-server", "nrtv-dispatcher", "./api"],
  function(SingleUseSocket, server, Dispatcher, api) {

    var startedServer
    var startedPort
    var forwards = {}

    function start(port, queue) {

      if (!queue) {
        queue = new Dispatcher()
      }

      SingleUseSocket.getReady()

      server.get(
        "/minions",
        function(request, response) {

          library.using(["./frame", library.reset("nrtv-browser-bridge")], 
            function(buildFrame, bridge) {

              var iframe = buildFrame(bridge, requestWork)

              bridge.sendPage(iframe)(request, response)
            }
          )

        }
      )

      function requestWork(callback) {
        queue.requestWork(callback)
      }

      api.installHandlers(server, queue)

      startedPort = port || 9777

      server.start(startedPort)

      startedServer = server

      console.log("Visit http://localhost:"+startedPort+" in a web browser to start working")
    }

    function stop() {
      startedServer.stop()
    }

    return {
      start: start,
      stop: stop,
      getPort: function() {
        return startedPort
      }
    }
  }
)