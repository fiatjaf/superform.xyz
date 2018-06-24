const React = window.React = require('react')
const h = window.h = require('react-hyperscript')
const pug = require('pug')
const fs = require('fs')
const req = require('d3-require').requireFrom(n => `https://bundle.run/${n}`)
const formExtract = require('form-extract')

window.ReactDOM = require('react-dom')

module.exports = class extends React.Component {
  render () {
    return (
      h('#View', {
        ref: el => {
          if (!el) return

          var depList = {}
          this.props.code.replace(/require *\(['"`]([^'"`]+)['"`]\)/g, (_, n) => {
            depList[n] = 1
          })
          depList = Object.keys(depList)

          Promise.all(depList.map(n => req(n))).then(deps => {
            var depMap = {}
            deps.forEach((dep, i) => {
              let depName = depList[i]
              depMap[depName] = dep
            })
            const require = n => depMap[n] || {}
            require.ok = true // just to please eslint

            var exports = {}
            var module = {}
            module.exports = exports

            try {
              eval(this.props.code)
            } catch (e) {}

            var state = {}
            if (exports.init) {
              try {
                state = exports.init()
              } catch (err) {
                console.error('failed to initialize state: ', err)
              }
            }

            for (let i = 0; i < this.props.entries.length; i++) {
              try {
                exports.reduce(state, this.props.entries[i])
              } catch (err) {
                console.error('failed to compute state:', err)
              }
            }

            const submit = data => {
              Object.keys(data)
                .forEach(k => {
                  if (!k) delete data[k]
                })
              if (!data || !Object.keys(data).length) return

              this.props.addEntry(data)
            }

            try {
              if (exports.view) {
                exports.view(el, state, submit)
              } else if (this.props.ui) {
                const pre = fs.readFileSync(__dirname + '/mixins.pug', 'utf-8')

                let html = pug.render(pre + '\n\n' + this.props.ui, {
                  entries: this.props.entries,
                  state: state,
                  user: this.props.user
                })
                el.innerHTML = html

                let forms = el.querySelectorAll('form')
                for (let i = 0; i < forms.length; i++) {
                  forms[i].onsubmit = e => {
                    e.preventDefault()

                    submit(formExtract(e.target))
                  }
                }
              }
            } catch (err) {
              console.error('failed to render view:', err)
            }
          }).catch(err => {
            console.error('failed to require dependencies:', err)
          })
        }
      })
    )
  }
}
