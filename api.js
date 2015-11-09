var library = require("nrtv-library")(require)

module.exports = library.export(
  "minion-api-client",
  ["request", "nrtv-dispatcher", "http"],
  function(request, Dispatcher, http) {


    // SERVER

    function installHandlers(server, dispatcher) {

      server.post("/tasks",
        function(request, response) {
          var task = request.body
          task.callback = function(message) {
            response.send(message)
          }
          dispatcher.addTask(task)
        }
      )

      var retainedMinions = {}

      server.post("/retainers",
        function(request, response) {

          var retainer = dispatcher.retainWorker()

          do {
            var id = Math.random().toString(36).split(".")[1].substr(0,5)
          } while(retainedMinions[id])

          retainedMinions[id] = retainer

          response.send({
            id: id
          })
        }
      )

      server.post(
        "/retainers/:id/tasks",
        function(request, response) {
          var id = request.params.id

          retainedMinions[id].addTask(
            request.body,
            function(message) {
              response.send(message)
            }
          )

        }
      )
    }


    // CLIENT

    function addTask() {
      var task = Dispatcher.buildTask(arguments)
      _addTask(task)
    }

    function _addTask(task, prefix) {
      var source = task.func.toString()

      var data = {
        isNrtvDispatcherTask: true,
        funcSource: source,
        options: task.options,
        args: task.args
      }

      post({
        path: "/tasks",
        prefix: prefix,
        data: data
      }, function(body) {
        task.callback(body)
      })
    }

    function post(options, callback) {
      var host = api.host || "http://localhost:9777"

      url = host+(options.prefix||"")+options.path

      var parameters = {
        url: url,
        method: "POST",
        json: true,
        headers: {"content-type": "application/json"},
        body: options.data
      }

      if (options.data) {
        var payload = JSON.stringify(options.data, null, 2)
      } else {
        payload = ""
      }

      console.log("POST →", url, payload)

      request.post(parameters,
        function(error, response) {

          function fail(error) {
            var params = JSON.stringify(parameters, null, 2)

            console.log(" ⚡ BAD REQUEST ⚡ :", params)

            if (typeof error == "string") {
              throw new Error(error)
            } else {
              throw error
            }
          }

          if (error) {
            fail(error)
          }

          var code = response.statusCode.toString()
          var status = http.STATUS_CODES[response.statusCode]

          if (response.statusCode > 399) {
            fail(code+" "+status)
          } else {
            console.log(code, status, "←", url)
          }

          callback(response.body)
        }
      )

    }



    function retainMinion(callback) {
      post({
        path: "/retainers",
      },
      function(response) {
        callback(
          new ApiRetainer(response.id)
        )
      })
    }

    function ApiRetainer(id) {
      this.id = id
    }

    ApiRetainer.prototype.addTask =
      function() {
        var task = Dispatcher.buildTask(arguments)
        var prefix = "/retainers/"+this.id
        _addTask(task, prefix)
      }

    ApiRetainer.prototype.resign =
      function() {
      }
    

    var api = {
      addTask: addTask,
      retainMinion: retainMinion,
      installHandlers: installHandlers,
      at: function(url) {
        if (this.host) {
          throw new Error("Already set api host to "+this.host)
        }
        this.host = url
        return this
      }
    }

    return api
  }
)