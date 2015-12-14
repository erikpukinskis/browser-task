var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-server",
  ["nrtv-single-use-socket", "nrtv-server", "nrtv-dispatcher", "./api", "nrtv-make-request", "nrtv-socket-server", "querystring", "./websocket-proxy"],
  function(SingleUseSocket, server, Dispatcher, api, makeRequest, socketServer, querystring, proxyConnection) {

    var startedPort
    var minionIds = {}
    var hostUrls = {}

    function start(port, queue) {

      if (!queue) {
        queue = new Dispatcher()
      }

      SingleUseSocket.installOn(server)

      server.addRoute(
        "get",
        "/minions",
        function(request, response) {

          do {
            var id = Math.random().toString(36).split(".")[1]
          } while (minionIds[id])

          library.using(
            ["./frame", library.reset("nrtv-browser-bridge")],
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

            var host = host = task.options.host

            if (host) {
              hostUrls[id] = host
            }

            callback(task)
          }
        )
      }

      server.use(proxyHttpRequests)

      socketServer.use(proxyWebsockets)

      api.installHandlers(server, queue)

      startedPort = port || 9777

      server.start(startedPort)

      console.log("Visit http://localhost:"+startedPort+" in a web browser to start working")
    }

    function proxyWebsockets(connection, next) {

      var myUrl = connection._session.ws.url
      if (myUrl.match(/6543/)) {
        throw new Error("HOW")
      }

      var params = querystring.parse(connection.url.split("?")[1])

      var id = params.__nrtvMinionId

      if (id) {
        var hostUrl = hostUrls[id]

        if (!hostUrl) {
          throw new Error("Tried to proxy websocket connection from minion "+id+" but the task didn't set a host?")
        }

        proxyConnection(connection, hostUrl)
      } else {
        next()
      }
    }

    function proxyHttpRequests(request, response, next) {
      var id = request.cookies.nrtvMinionId

      if (!id) { return next() }

      var host = hostUrls[id]

      var isFavicon = request.path == "/favicon.ico"

      if (!host && !isFavicon) {
        return response.status(400).send("Tried to request "+request.path+", but the task didn't specify a host so the minion server doesn't know how to route the request.")
      }

      if (host) {
        var url = "http://"+host+request.url
      } else {
        var url = request.url
      }

      makeRequest({
        url: url,
        method: request.method,
        data: request.body
      }, function(body) {
        response.send(body)
      })
    }

    function stop() {
      server.stop()
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