var library = require("module-library")(require)

module.exports = library.export(
  "minion-server",
  ["single-use-socket", "web-site", "job-pool", "./api", "make-request", "get-socket", "querystring", "./websocket-proxy", "./frame", "browser-bridge"],
  function(SingleUseSocket, WebSite, JobPool, api, makeRequest, getSocket, querystring, proxySocket, buildFrame, BrowserBridge) {

    var startedPort
    var minionIds = {}
    var hostUrls = {}

    var site = new WebSite()

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

          var iframe = buildFrame(site, bridge, requestWork, id)

          bridge.forResponse(response).send(iframe)
        }
      )

      function requestWork(callback, id) {
        jobPool.requestWork(
          function(task) {
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
        headers.date = null

      if (url == "http://localhost:5111/more") {
        debugger
      }

      headers["Cache-Control"] = "max-age=0"

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