var runTest = require("run-test")(require)

// runTest.only("controlling minions through the API")
// runTest.only("a minion presses a button and reports back what happened")
// runTest.only("retaining minions and reporting objects")
// runTest.only("proxying websockets")
runTest.only("loads a page")


runTest.failAfter(10000000)

function halp(port, done) {
  console.log("---\nExcuse me, human!\n\nYou have 10 seconds to open http://localhost:"+port+"/minions in a web\nbrowser so the tests can finish! Go!\n\nLove,\nComputer\n---")  
}

runTest(
  "loads a page",

  ["./", "web-site", "web-element", "browser-bridge", "./start-server", "./api"],
  function(expect, done, browserTask, Server, element, bridge, startServer, api) {

    var apiServer = startServer(8888)

    var server = new Server()

    var morph = bridge.defineFunction(
      function() {
        document.querySelector("button").innerHTML = "bite me!"
      }
    )

    var butt = element("button", {
      onclick: morph.evalable()
    }, "click me!")

    server.addRoute("get", "/",
      bridge.sendPage(butt)
    )

    server.start(8818)

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

    halp(8888, done)

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
        server.stop()
        apiServer.stop()
        done()
      })
    }

  }
)


runTest(
  "knows what classes an element has",

  ["./", "web-site", "web-element", "browser-bridge"],
  function(expect, done, browserTask, Server, element, bridge) {

    var visible = element(".greg", "Hi my name is Greg")

    var invisible = element(".gina.tall", "Gina up here")

    var server = new Server()

    server.addRoute(
      "get",
      "/",
      bridge.sendPage([
        visible,
        invisible
      ])
    )

    server.start(9293)

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
            server.stop,
            done
          )
        }
      }
    )

  }
)



runTest(
  "can wait for a new page",
  ["./", "web-element", "browser-bridge", "web-site", "nrtv-wait"],
  function(expect, done, browse, element, BrowserBridge, Server, wait) {

    var server = new Server()

    server.addRoute("get", "/",
      function(request, response) {
        var bridge = new BrowserBridge()

        var link = element("a.go", {href: "/maxim"}, "go")

        bridge.sendPage(link)(null, response)
      }
    )

    server.addRoute("get", "/maxim",
      function(request, response) {
        var bridge = new BrowserBridge()
        bridge.asap(
          bridge.defineFunction(
            [wait.defineInBrowser(bridge)],
            function(wait) {
              var ticket = wait("start")
              setTimeout(function() {
                document.write("make bread not trips to the grocery store!")
                wait("done", ticket)
              }, 10)
            }
          )
        )
        bridge.sendPage()(null, response)
      }
    )

    server.start(4444)

    browse(
      "http://localhost:4444",
      function(browser) {

        browser.click.andWaitForNewPage(".go", runChecks)

        function runChecks() {
          browser.assertText(
            "body",
            /bread not trips/,
            browser.done,
            server.stop,
            done
          )
        }

      }
    )

  }
)



runTest.define(
  "button-server",
  ["web-element", "browser-bridge", "web-site", "make-request"],
  function(element, BrowserBridge, Server, makeRequest) {

    var bridge = new BrowserBridge()

    function ButtonStuff() {
      var server = new Server()

      server.addRoute(
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

      server.addRoute("get", "/", bridge.sendPage(butt))

      this.start = function(port) {
        server.start(port)
      }

      this.stop = function() {
        server.stop()
      }
    }

    return ButtonStuff
  }
)

runTest(
  "a minion presses a button and reports back what happened",
  ["./start-server", "./api", "button-server", "nrtv-dispatcher"],
  function(expect, done, startServer, api, ButtonServer, Dispatcher) {

    var app = new ButtonServer()
    var queue = new Dispatcher()
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

    halp(8888, done)
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

    halp(8888, done)
  }
)



runTest(
  "retaining minions and reporting objects",
  ["./start-server", "./api", "nrtv-dispatcher"],
  function(expect, done, startServer, api, Dispatcher) {

    var dispatcher = new Dispatcher()

    var server = startServer(8888, dispatcher)

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
      dispatcher.addTask(
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

    halp(8888, done)
  }
)


runTest(
  "proxying websockets",
  ["./start-server", "nrtv-dispatcher", "web-site", "get-socket", "browser-bridge"],
  function(expect, done, startServer, Dispatcher, Server, getSocket, BrowserBridge) {

    var booServer = new Server()

    getSocket.handleConnections(
      booServer,
      function(socket) {
        socket.listen(runChecks)
      }
    )

    booServer.start(6543)

    var queue = new Dispatcher()

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
      bridge.sendPage()
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

    halp(8888, done)

    function runChecks(message) {
      expect(message).to.equal("boo!")
      booServer.stop()
      apiServer.stop()
      done()
    }
  }
)


