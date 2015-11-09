var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-server",
  ["nrtv-single-use-socket", "nrtv-server", "nrtv-dispatcher", "./api", "nrtv-make-request"],
  function(SingleUseSocket, server, Dispatcher, api, makeRequest) {

    var startedServer
    var startedPort

    function start(port, queue) {

      if (!queue) {
        queue = new Dispatcher()
      }

      SingleUseSocket.getReady()

      var minionIds = {}
      var hostUrls = {}

      server.get(
        "/minions",
        function(request, response) {

          do {
            var id = Math.random().toString(36).split(".")[1]
          } while (minionIds[id])

          library.using(["./frame", library.reset("nrtv-browser-bridge")], 
            function(buildFrame, bridge) {

              var iframe = buildFrame(bridge, requestWork, id)

              bridge.sendPage(iframe)(request, response)
            }
          )

        }
      )

      function requestWork(callback, id) {
        queue.requestWork(
          function(task) {
            hostUrls[id] = task.options.host
            callback(task)
          }
        )
      }

      server.use(
        function(request, response, next) {
          var id = request.cookies.nrtvMinionId

          if (!id) { return next() }

          var url = hostUrls[id] || ""
          url += request.url

          makeRequest({
            url: url,
            method: request.method,
            data: request.body
          }, function(body) {
            response.send(body)
          })
        }
      )

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