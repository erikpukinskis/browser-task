var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-server",
  ["nrtv-single-use-socket", "web-site", "nrtv-dispatcher", "./api", "make-request", "get-socket", "querystring", "./websocket-proxy", "./frame", "browser-bridge"],
  function(SingleUseSocket, webSite, Dispatcher, api, makeRequest, getSocket, querystring, proxySocket, buildFrame, BrowserBridge) {

    var startedPort
    var minionIds = {}
    var hostUrls = {}

    function start(port, queue) {

      if (!queue) {
        queue = new Dispatcher()
      }

      webSite.addRoute(
        "get",
        "/minions",
        function(request, response) {

          do {
            var id = Math.random().toString(36).split(".")[1]
          } while (minionIds[id])

          minionIds[id] = true

          var bridge = new BrowserBridge()

          var iframe = buildFrame(bridge, requestWork, id)

          bridge.sendPage(iframe)(request, response)

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

      webSite.use(proxyHttpRequests)

      SingleUseSocket.installOn(webSite)

      getSocket.handleConnections(webSite, proxyWebsockets)

      api.installOnWebSite(webSite, queue)

      startedPort = port || 9777

      webSite.start(startedPort)

      console.log("Visit http://localhost:"+startedPort+" in a web browser to start working")

      return webSite
    }

    function proxyWebsockets(socket, next) {

      var myUrl = socket.url
      
      var params = querystring.parse(myUrl.split("?")[1])

      var id = params.__nrtvMinionId

      if (id) {
        var hostUrl = hostUrls[id]

        if (!hostUrl) {
          throw new Error("Tried to proxy websocket connection from minion "+id+" but the task didn't set a host?")
        }

        proxySocket(socket, hostUrl)
      } else {
        console.log("missed URL", myUrl)
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
        data: request.body,
        contentType: request.header("content-type")
      }, function(body) {
        response.send(body)
      })
    }

    return start
  }
)