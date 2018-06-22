const React = window.React = require('react')
const h = window.h = require('react-hyperscript')
const pug = require('pug')
const formExtract = require('form-extract')

window.ReactDOM = require('react-dom')

module.exports = class extends React.Component {
  render () {
    return (
      h('.view', {
        ref: el => {
          if (!el) return

          var module = {exports: {}}

          try {
            eval(this.props.code)
          } catch (e) {}

          var state = {}
          for (let i = 0; i < this.props.entries.length; i++) {
            try {
              (module.reduce || module.exports.reduce)(state, this.props.entries[i])
            } catch (err) {
              console.error('failed to compute state: ', err)
            }
          }

          const submit = data => {
            Object.keys(data)
              .forEach(k => {
                if (!k) delete data[k]
              })
            if (!data || Object.keys(data).length) return

            this.props.addEntry(data)
          }

          try {
            if (module.view || module.exports.view) {
              (module.view || module.exports.view)(el, state, submit)
            } else if (this.props.ui) {
              let html = pug.render(this.props.ui, {
                entries: this.props.entries,
                state: this.props.state,
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
            console.error('failed to render view: ', err)
          }
        }
      })
    )
  }
}
