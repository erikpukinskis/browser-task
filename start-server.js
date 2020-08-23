var library = require("module-library")(require)

module.exports = library.export(
  "minion-server",
  ["single-use-socket", "web-site", "job-pool", "./api", "make-request", "get-socket", "querystring", "./websocket-proxy", "./controllable-iframe", "browser-bridge"],
  function(SingleUseSocket, WebSite, JobPool, api, makeRequest, getSocket, querystring, proxySocket, buildControllableIframe, BrowserBridge) {

    var startedPort
    var minionIds = {}
    var hostUrls = {}

    var site = new WebSite()

    // We track which sockets _we_ have opened so we can give good error messages when there's an orphan socket.
    var sockets = {}
    function registerSocket(socket) {
      sockets[socket.id] = socket
    }
    function resignSocket(socket) {
      delete sockets[socket.id]
    }

    function start(port, jobPool) {

      if (!jobPool) {
        jobPool = new JobPool()
      }

      site.addRoute(
        "get",
        "/minions",
        function(request, response) {

          do {
            var id = Math.random().toString(36).split(".")[1]
          } while (minionIds[id])

          minionIds[id] = true

          var bridge = new BrowserBridge()
          bridge.addToHead("<title>BROWSER TASK 4000</title>")

          var iframe = buildControllableIframe(site, bridge, requestWork, id, registerSocket, resignSocket)

          bridge.forResponse(response).send(iframe)
        }
      )

      site.addRoute(
        "get",
        "/favicon.ico",
        site.sendFile(__dirname, 'favicon.ico'))

      function requestWork(callback, id) {
        jobPool.requestWork(
          function runBrowserTask(task) {
            var host = host = task.options.host

            if (host) {
              hostUrls[id] = host
            }

            callback(task)
          }
        )
      }

      site.use(proxyHttpRequests)

      SingleUseSocket.installOn(site)

      getSocket.handleConnections(site, proxyWebsockets)

      api.installOnWebSite(site, jobPool)

      startedPort = port || 9777

      site.start(startedPort)

      console.log("Visit http://localhost:"+startedPort+" in a web browser to start working")

      return site
    }

    function proxyWebsockets(socket, next) {

      var myUrl = socket.url

      var params = querystring.parse(myUrl.split("?")[1])

      var minionId = params.__nrtvMinionId
      var socketId = params.__nrtvSingleUseSocketIdentifier

      if (minionId) {
        var hostUrl = hostUrls[minionId]

        if (!hostUrl) {
          throw new Error("Tried to proxy websocket connection from minion "+minionId+" but the task didn't set a host?")
        }

        console.log("Proxying minion socket connection request", myUrl, "to", hostUrl)

        proxySocket(socket, hostUrl)
      } else if (socketId in sockets) {
        next()
      } else {
        throw new Error("Unrecognized socket connection request:", myUrl)
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

      var HEADER_BLACKLIST = [
        "accept-encoding",
        "accept-language",
        "accept"]

      var headers = {}
      for (var key in request.headers) {
        var isBlocked = contains(
          HEADER_BLACKLIST,
          key)
        if (isBlocked) {
          continue }
        headers[key] = request.headers[key] }

      makeRequest({
        url: url,
        method: request.method,
        headers: headers,
        data: request.body,
      }, function(body, res, error) {
        if (error) {
          console.log("! error on "+url+": "+error)
          return
        }
        response.statusCode = res.statusCode
        response.headers = res.headers
        response.send(body)
      })
    }

    function contains(array, value) {
      if (!Array.isArray(array)) {
        throw new Error("looking for "+JSON.stringify(value)+" in "+JSON.stringify(array)+", which is supposed to be an array. But it's not.")
      }
      var index = -1;
      var length = array.length;
      while (++index < length) {
        if (array[index] == value) {
          return true;
        }
      }
      return false;
    }

    return start
  }
)