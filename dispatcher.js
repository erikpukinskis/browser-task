var library = require("nrtv-library")(require)

module.exports = library.export(
  "dispatcher",
  [library.collective({})],
  function(collective) {
    function Dispatcher() {
      this.tasks = []
      this.workers = []
      this.working = false
    }

    Dispatcher.prototype.addTask =
      function() {
        var task = {}

        for(var i=0; i<arguments.length; i++) {
          var arg = arguments[i]
          var isFunction = typeof arg == "function"

          if (isFunction && !task.func) {
            task.func = arg
          } else if (isFunction) {
            task.callback = arg
          } else if (Array.isArray(arg)) {
            task.args = arg
          } else {
            throw Error()
          }
        }
        this.tasks.push(task)
        this.work()
      }

    function callable(func) {
      if (typeof func == "string") {
        return eval("f="+func)
      } else if (typeof func == "function") {
        return func
      } else {
        throw new Error(func+" can't be turned into a function")
      }
    }

    Dispatcher.prototype.requestWork =
      function(callback) {
        this.workers.push(callback)
        this.work()
        var workers = this.workers

        return {
          quit: function() {
            var i = workers.indexOf(callback)
            workers.splice(i, 1)
            callback.__nrtvMinionQuit = true
          }
        }
      }

    Dispatcher.prototype.work =
      function() {
        if (this.working) { return }
        this._work()
      }

    Dispatcher.prototype._work =
      function() {
        var noTasks = this.tasks.length < 1
        var noWorkers = this.workers.length < 1

        if (noTasks || noWorkers) {
          this.working = false
          return
        } else {
          this.working = true
        }

        var queue = this

        var worker = this.workers.shift()
        var task = this.tasks.shift()
        var workToDo = task.func
        var callback = task.callback


        function checkForMore(queue, worker, message) {
          callback(message)

          if (!worker.__nrtvMinionQuit) {
            queue.workers.push(worker)
          }

          queue._work()
        }

        worker(
          workToDo,
          checkForMore.bind(
            null, queue, worker
          ),
          task.args
        )

        this._work()
      }

    library.collectivize(
      Dispatcher,
      collective,
      ["addTask", "requestWork"]
    )

    return Dispatcher
  }
)