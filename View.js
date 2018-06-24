const React = require('react')
const h = require('react-hyperscript')
const pug = require('pug')
const fs = require('fs')
const req = require('d3-require').requireFrom(n => `https://bundle.run/${n}`)
const formExtract = require('form-extract')
const diff = require('diffhtml')

const {n_error, n_success} = require('./helpers')

const localRequires = {
  'react-hyperscript': h,
  'react': React,
  'pug': pug,
  'react-dom': require('react-dom'),
  'cuid': require('cuid'),
  'debounce': require('debounce'),
  'throttleit': require('throttleit')
}

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

          for (let n in localRequires) {
            delete depList[n]
          }

          depList = Object.keys(depList)

          Promise.all(depList.map(n => req(n))).then(deps => {
            var depMap = {}
            deps.forEach((dep, i) => {
              let depName = depList[i]
              depMap[depName] = dep
            })
            // eslint-disable-next-line no-unused-vars
            const require = n => depMap[n] || localRequires[n]

            var exports = {}
            var module = {}
            module.exports = exports

            try {
              eval(this.props.code)
            } catch (e) {
              n_error(`Failed to run your code. See the console for more information.`)
              console.warn('failed to run your code:', e)
              return
            }

            var state = {}
            if (exports.init) {
              try {
                state = exports.init()
              } catch (err) {
                n_error(`Failed to initialize state. See the console for more information.`)
                console.warn('failed to initialize state: ', err)
              }
            }

            for (let i = 0; i < this.props.entries.length; i++) {
              try {
                exports.reduce(state, this.props.entries[i].data)
              } catch (err) {
                n_error(`Failed to compute state. See the console for more information.`)
                console.warn('failed to compute state:', err)
              }
            }

            const submit = data => {
              Object.keys(data)
                .forEach(k => {
                  if (!k) delete data[k]

                  let num = parseFloat(data[k])
                  // eslint-disable-next-line eqeqeq
                  if (num == data[k]) data[k] = num
                })
              if (!data || !Object.keys(data).length) {
                n_error('Submission is empty!')
                return
              }

              this.props.addEntry(data)
              n_success(`Submission received: <pre><code>${JSON.stringify(data)}</code></pre>`)
            }

            try {
              if (exports.view) {
                exports.view(el, state, submit)
              } else if (this.props.ui) {
                const pre = fs.readFileSync(__dirname + '/mixins.pug', 'utf-8')

                let html = pug.render(pre + '\n\n' + this.props.ui, {
                  entries: this.props.entries.map(e => e.data),
                  state: state,
                  user: this.props.user
                })

                // render the new view
                diff.innerHTML(el, html)

                // listen to form submit events
                let forms = el.querySelectorAll('form')
                for (let i = 0; i < forms.length; i++) {
                  forms[i].onsubmit = e => {
                    e.preventDefault()

                    submit(formExtract(e.target))
                  }
                }
              }
            } catch (err) {
              n_error(`Failed to render view. See the console for more information.`)
              console.warn('failed to render view:', err)
            }
          }).catch(err => {
            n_error(`Failed to require dependencies. See the console for more information.`)
            console.warn('failed to require dependencies:', err)
          })
        }
      })
    )
  }
}
