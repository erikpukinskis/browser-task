var runTest = require("run-test")(require)
var childProcess = require("child_process")

// runTest.only("loads a page")
// runTest.only("knows what classes an element has")
// runTest.only("can wait for a new page")
// runTest.only("a minion presses a button and reports back what happened")
// runTest.only("controlling minions through the API")
// runTest.only("retaining minions and reporting objects")
runTest.only("proxying websockets")

function halp(port) {
  childProcess.exec("open http://localhost:"+port+"/minions")
}

runTest(
  "loads a page",

  ["./", "web-site", "web-element", "browser-bridge", "./start-server", "./api"],
  function(expect, done, browserTask, WebSite, element, BrowserBridge, startServer, api) {

    var apiServer = startServer(8888)
    var site = new WebSite()
    var bridge = new BrowserBridge()

    var morph = bridge.defineFunction(
      function() {
        document.querySelector("button").innerHTML = "bite me!"
      }
    )

    var butt = element("button", {
      onclick: morph.evalable()
    }, "click me!")

    site.addRoute("get", "/",
      bridge.requestHandler(butt)
    )

    site.start(8818)

    var browser = browserTask(
      "http://localhost:8818",
      function() {
        browser.assertText(
          "button",
          /click me/,
          pressButton
        )
      },
      {server: "http://localhost:8888"}
    )

    halp(8888)

    function pressButton() {
      browser.pressButton("button", checkText)
    }

    function checkText() {
      browser.assertText(
        "button",
        /bite me/,
        finish
      )
    }

    function finish() {
      browser.done(function() {
        site.stop()
        apiServer.stop()
        done()
      })
    }

  }
)


runTest(
  "knows what classes an element has",

  ["./", "web-site", "web-element", "browser-bridge", "./start-server", "job-pool"],
  function(expect, done, browserTask, WebSite, element, BrowserBridge, startServer, JobPool) {

    var visible = element(".greg", "Hi my name is Greg")

    var invisible = element(".gina.tall", "Gina up here")

    var apiServer = startServer(8888)
    var site = new WebSite()
    var bridge = new BrowserBridge()

    site.addRoute(
      "get",
      "/",
      bridge.requestHandler([
        visible,
        invisible
      ])
    )

    site.start(9293)

    browserTask("http://localhost:9293",
      function(browser) {

        browser.assertHasClass(
          ".gina",
          "tall",
          checkMissing
        )

        function checkMissing() {
          done.ish("knows when a class is present")

          browser.assertNoClass(
            ".greg",
            "tall",
            browser.done,
            site.stop,
            apiServer.stop,
            done
          )
        }
      },
      {server: "http://localhost:8888"}
    )

    halp(8888)

  }
)



runTest(
  "can wait for a new page",
  [runTest.library.ref(), "./", "web-element", "browser-bridge", "web-site", "global-wait", "./start-server", "bridge-module"],
  function(expect, done, lib, browserTask, element, BrowserBridge, WebSite, wait, startServer, bridgeModule) {

    var apiServer = startServer(8888)
    var site = new WebSite()

    site.addRoute("get", "/",
      function(request, response) {
        var bridge = new BrowserBridge()

        var link = element("a.go", {href: "/maxim"}, "go")

        bridge.requestHandler(link)(null, response)
      }
    )

    site.addRoute("get", "/maxim",
      function(request, response) {
        var bridge = new BrowserBridge()
        bridge.domReady(
          bridge.defineFunction(
            [bridgeModule(lib, "global-wait", bridge)],
            function(wait) {
              var ticket = wait.start(
                "write to page")
              setTimeout(function() {
                document.body.innerHTML = "make bread not trips to the grocery store!"
                wait.finish(ticket)
              }, 10)
            }
          )
        )
        bridge.forResponse(response).send()
      }
    )

    site.start(4444)

    browserTask(
      "http://localhost:4444",
      function(browser) {

        browser.click.andWaitForNewPage(".go", runChecks)

        function runChecks() {
          browser.assertText(
            "body",
            /bread not trips/,
            browser.done,
            site.stop,
            apiServer.stop,
            done,
          )
        }

        function finish() {
          console.log("OK everything good")
          return
          browser.done()
          site.stop()
          apiServer.stop()
          done()
        }

      },
      {server: "http://localhost:8888"}
    )

    // done.failAfter(1000*1000)
    halp(8888)
  }
)



runTest.define(
  "button-server",
  ["web-element", "browser-bridge", "web-site", "make-request"],
  function(element, BrowserBridge, WebSite, makeRequest) {

    var bridge = new BrowserBridge()

    function ButtonStuff() {
      var site = new WebSite()

      site.addRoute(
        "get", "/slowness",
        function(request, response) {
          setTimeout(function() {
            response.send("a hey ahoy!")
          }, 100)
        }
      )

      var ahey = bridge.defineFunction(
        [makeRequest.defineOn(bridge)],
        function(makeRequest) {
          makeRequest(
            "get",
            "/slowness",
            function(text) {
              document.querySelector("body").innerHTML = text
            }
          )
        }
      )

      var butt = element(
        "button.hai",
        {onclick: ahey.evalable()},
        "O hai"
      )

      site.addRoute("get", "/", bridge.requestHandler(butt))

      this.start = function(port) {
        site.start(port)
      }

      this.stop = function() {
        site.stop()
      }
    }

    return ButtonStuff
  }
)

runTest(
  "a minion presses a button and reports back what happened",
  ["./start-server", "./api", "button-server", "job-pool"],
  function(expect, done, startServer, api, ButtonServer, JobPool) {

    var app = new ButtonServer()
    var queue = new JobPool()
    app.start(7777)
    var apiServer = startServer(8888, queue)

    queue.addTask(
      {host: "localhost:7777"},
      function doSomeFunStuff(testVariable, minion, iframe) {
        if (testVariable != "hi") {
          throw new Error("Minion didn't get data!")
        }

        minion.browse("/", function() {

          var button = iframe.contentDocument.querySelector(".hai")

          button.click()

          minion.wait.forIframe(iframe, function() {
            minion.report(iframe.contentDocument.querySelector("body").innerHTML)
          })

        })
      },
      function(message) {
        expect(message).to.equal("a hey ahoy!")
        done()
        app.stop()
        apiServer.stop()
      },
      ["hi"]
    )

    halp(8888)
  }
)

runTest(
  "controlling minions through the API",
  ["./start-server", "./api"],
  function(expect, done, startServer, api) {

    var apiServer = startServer(8888)

    var minions = api.at("http://localhost:8888")
    minions.addTask(
      function(frameOfReference, minion, iframe) {
        minion.report("IT IS A VERY PRETTY DAY " + frameOfReference + "!")
      },
      ["for Fred"],
      function(message) {
        expect(message).to.equal("IT IS A VERY PRETTY DAY for Fred!")
        apiServer.stop()
        done()
      }
    )

    halp(8888)
  }
)



runTest(
  "retaining minions and reporting objects",
  ["./start-server", "./api", "job-pool"],
  function(expect, done, startServer, api, JobPool) {

    var JobPool = new JobPool()

    var server = startServer(8888, JobPool)

    var api = api.at("http://localhost:8888")

    api.retainMinion(
      function(minion) {
        minion.addTask(
          function(minion) {
            minion.report({
              friends: 3
            })
          },
          function(message) {
            expect(message).to.have.property("friends", 3)
            minion.resign()
            verifyFREEDOM()
          }
        )
      }
    )

    function verifyFREEDOM() {
      JobPool.addTask(
        function(minion) {
          minion.report("purd says, what purd has to say")
        },
        function(yes) {
          expect(yes).to.match(/purd/)
          server.stop()
          done()
        }
      )
    }

    halp(8888)
  }
)


runTest(
  "proxying websockets",
  ["./start-server", "job-pool", "web-site", "get-socket", "browser-bridge"],
  function(expect, done, startServer, JobPool, WebSite, getSocket, BrowserBridge) {

    var booServer = new WebSite()

    getSocket.handleConnections(
      booServer,
      function(socket) {
        socket.listen(runChecks)
      }
    )

    booServer.start(6543)

    var queue = new JobPool()

    var apiServer = startServer(8888, queue)

    // now we have the problem that addTask can't take modules. So we need to navigate to a page that does this shit?

    var bridge = new BrowserBridge()

    var sendBoo =
      bridge.defineFunction(
        [getSocket.defineOn(bridge)],
        function(getSocket) {
          getSocket(function(socket) {
            socket.send("boo!")
          })
        }
      )

    bridge.asap(sendBoo)

    booServer.addRoute("get", "/boo",
      bridge.requestHandler()
    )

    queue.addTask(
      {host: "localhost:6543"},
      function(minion) {
        minion.browse("/boo", function() {
          minion.report("done")
        })
      },
      function() {}
    )

    halp(8888)

    function runChecks(message) {
      expect(message).to.equal("boo!")
      booServer.stop()
      apiServer.stop()
      done()
    }
  }
)


