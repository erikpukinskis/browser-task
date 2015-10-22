var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-minion-queue",
  [library.collective({})],
  function(collective) {
    function MinionQueue() {
      this.tasks = []
      this.workers = []
      this.working = false
    }

    MinionQueue.prototype.addTask =
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

    MinionQueue.prototype.requestWork =
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

    MinionQueue.prototype.work =
      function() {
        if (this.working) { return }
        this.working = true
        this._work()
      }

    MinionQueue.prototype._work =
      function() {
        var noTasks = this.tasks.length < 1
        var noWorkers = this.workers.length < 1

        if (noTasks || noWorkers) {
          this.working = false
          return
        }

        this.working = true
        var _this = this

        var worker = this.workers.shift()
        var task = this.tasks.shift()
        var func = task.func
        var callback = task.callback

        function report(_this, worker, message) {
          callback(message)

          if (!worker.__nrtvMinionQuit) {
            _this.workers.push(worker)
          }

          _this._work()
        }


        var startOver = report.bind(null, _this, worker)

        var args = [startOver].concat(task.args)

        func.apply(null, args)

        this._work()
      }

    library.collectivize(
      MinionQueue,
      collective,
      ["addTask", "requestWork"]
    )

    return MinionQueue
  }
)