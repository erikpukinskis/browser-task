var library = require("module-library")(require)

module.exports = library.export(
  "browser-task",
  ["./api", "guarantor"],
  function(api, guarantor) {

    var log = console.outdent || log

    var stacks = {}

    function browserTask(url, callback, options) {

      if (serverUrl = options && options.server) {
        api = api.at(serverUrl)
      }

      var urlParts = url.match(
        /^[^\/]+:\/\/([^\/]+)(.*)$/i
      )
      var hostUrl = urlParts[1]
      var path = urlParts[2]
      if (path[0] != "/") {
        path = "/"+path
      }

      try {
        throw new Error("You still have minions checked out, but the process is exiting! Did you forget to call browser.done()?\n\nYou started browsing here:")
      } catch (e) {
        var stack = e.stack
      }

      var browser = new Browser(hostUrl)

      api.retainMinion(
        function(minion) {
          var assignThem = assignMinion.bind(null, browser, minion, callback)

          minion.addTask(
            {host: hostUrl},
            function browse(path, minion) {
              minion.browse(path, minion.report)
            },
            [path],
            assignThem
          )
        }
      )

      return browser
    }

    function Browser(hostUrl) {
      this.hostUrl = hostUrl
      this.click.andWaitForNewPage = clickAndWaitForNewPage.bind(this)
      this.done = this.done.bind(this)
    }

    function assignMinion(browser, minion, callback, message) {
      browser.minion = minion
      browser.ready = true
      if (callback) {
        callback(browser)
      }
    }

    Browser.prototype.done = function(callback) {
      assertMinion(this, "done")

      var minion = this.minion

      if (!minion.browserResigned) {
        minion.resign(
          function finish() {
            delete stacks[minion.id]
            callback && callback()
          }
        )
        minion.browserResigned = true
      }
    }

    function assertRetained(browser) {
      if (browser.minion.browserResigned) {
        throw new Error("Tried to do something with a browser minion, but we already resigned it! Did you call browser.done() too soon?")
      }
    }

    function assertMinion(browser, method) {
      if (!browser.minion) {
        throw new Error("Can't do browser."+method+" before we even load a page. Try:\n\n  browse(\""+browser.hostUrl+"\", function(browser) {\n    browser."+method+"(...)\n  })\n")
      }
    }

    guarantor(
      function(callback, status) {
        var retainers = Object.keys(stacks)
        if (retainers.length > 0) {
          var stackFromFirstBrowse = stacks[retainers[0]]
          log("\n"+stackFromFirstBrowse, "\n")
        }
        callback()
      }
    )


    Browser.prototype.click =
    Browser.prototype.pressButton =
      function(selector, callback) {

        assertMinion(this, "click")
        assertRetained(this)

        this.minion.addTask(
          function pressButton(selector, minion, iframe) {

            var element = iframe.contentDocument.querySelector(selector)

            if (!element) {
              minion.report(false)
              return
            }

            element.click()

            minion.wait.forIframe(iframe, function() {
              minion.report(true)
            })
          },
          [selector],
          function(wasFound) {
            if (!wasFound) {
              throw new Error("Tried to click \""+selector+"\" but no elements match that selector.")
            }
            callback && callback()
          }
        )
      }

    function clickAndWaitForNewPage(selector, callback) {

      assertMinion(this, "click")
      assertRetained(this)

      this.minion.addTask(
        function clickAndWait(selector, minion, iframe) {

          var element = iframe.contentDocument.querySelector(selector)

          if (!element) {
            minion.report(false)
            return
          }

          iframe.onload =
            function() {
              minion.wait.forIframe(
                iframe, function() {
                  minion.report(true)
                }
              )
            }

          element.click()

        },
        [selector],
        function(wasFound) {
          if (!wasFound) {
            throw new Error("Tried to click \""+selector+"\" but no elements match that selector.")
          }
          callback && callback()
        }
      )

    }

    Browser.prototype.eval =
      function(func, args, callback) {

        assertMinion(this, "eval")
        assertRetained(this)

        console.log('args are', args)

        this.minion.addTask(
          function minionEval(func, args, minion, iframe) {

            args.push(function(value) {
              minion.report(value)
            })

            iframe.contentWindow.eval("("+func+")").apply(null, args)
          },
          [func.toString(), args],
          callback
        )
      }


    function getElementInfo(minion, selector, goal, callback) {

      minion.addTask(
        function getElementInfo(selector, minion, iframe) {

          var element = iframe.contentDocument.querySelector(selector)

          minion.report({
            wasFound:
              !!element,
            text: element && element.innerText,
            classList: element && element.className.split(" ")
          })
        },
        [selector],
        function(element) {
          if (!element.wasFound) {
            throw new Error("You wanted the element that matches "+selector+" to "+goal+" but no elements did.")
          }
          callback(element)
        }
      )

    }

    function getCallbacks(args, start) {
      var callbacks = Array.prototype.slice.call(args, start)

      var args = Array.prototype.slice.call(args)

      if (callbacks.length < 1) {
        throw new Error("browser.assertions need at least one callback. You passed "+JSON.stringify(args))
      }

      return callbacks
    }

    Browser.prototype.assertText =
      function(selector, pattern, callback1, callback2) {

        if (typeof selector != "string") {
          throw new Error("First argument to browser.assertText needs to be a selector for the element to search. You passed ", selector)
        }

        var isString = typeof pattern == "string"
        var isRegExp = !isString && pattern.constructor && pattern.constructor.name == "RegExp"

        if (!isString && !isRegExp) {
          throw new Error("Second argument to browser.assertText needs to be a string or a regular expression to search for. You passed "+pattern)
        }

        assertMinion(this, "assertText")
        assertRetained(this)

        var callbacks = getCallbacks(arguments, 2)

        var goal = "match "+pattern

        getElementInfo(
          this.minion,
          selector,
          goal,
          function(element) {
            if (!element.text.match(pattern)) {
              throw new Error("The element that matched \""+selector+"\" contained \""+element.text+"\" which doesn't match "+pattern)
            } else {
              log("  ✓  "+selector+" matched "+pattern)

              parallel(callbacks)
            }
          }
        )
      }

    Browser.prototype.assertHasClass =
      function(selector, className, callback) {

        assertMinion(this, "assertHasClass")
        assertRetained(this)

        var callbacks = getCallbacks(arguments, 2)

        var goal = "have the class "+className

        getElementInfo(
          this.minion,
          selector,
          goal,
          function(element) {

            var index = element.classList.indexOf(className)

            if (index < 0) {
              throw new Error("Expected \""+selector+"\" to have the class \""+className+"\" but it had "+JSON.stringify(element.classList))
            } else {
              log("  ✓  "+selector+" had the "+className+" class")
            }

            parallel(callbacks)
          }
        )

      }

    Browser.prototype.assertNoClass =
      function(selector, className, callback) {

        assertRetained(this)

        var callbacks = getCallbacks(arguments, 2)

        var goal = "not have the class "+className

        getElementInfo(
          this.minion,
          selector,
          goal,
          function(element) {

            var index = element.classList.indexOf(className)

            if (index >= 0) {
              throw new Error("Expected \""+selector+"\" to not have the class \""+className+"\" but it had "+JSON.stringify(element.classList))
            } else {
              log("  ✓  "+selector+" didn't have the "+className+" class")
            }

            parallel(callbacks)
          }
        )

      }

    function parallel(funcs, callback) {
      var calls = {
        left: funcs.length,
        callback: callback
      }

      var bound = funcs.map(function(func) {
        return func.bind(finish.bind(calls))
      })

      for(var i=0; i<bound.length; i++) {
        bound[i]()
      }

      function finish() {
        this.left--
        if (this.left == 0) {
          this.callback()
        }
      }
    }


    return browserTask
  }
)


