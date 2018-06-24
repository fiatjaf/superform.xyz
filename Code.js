const React = require('react')
const h = require('react-hyperscript')
const debounce = require('debounce')
const CodeMirror = require('react-codemirror2').Controlled

require('codemirror/mode/javascript/javascript')

module.exports = class extends React.Component {
  constructor (props) {
    super(props)

    this.dsaveCode = debounce(this.saveCode.bind(this), 2000).bind(this)

    this.state = {
      code: this.props.code,
      changed: false
    }
  }

  static getDerivedStateFromProps (props, state) {
    if (props.code !== state.code) {
      return {
        code: state.changed ? state.code : props.code,
        changed: false
      }
    }
    return null
  }

  render () {
    return (
      h('div', [
        h('h1', 'Reducer'),
        h(CodeMirror, {
          value: this.state.code,
          onBeforeChange: (editor, data, code) => {
            this.setState({code, changed: true})
          },
          onChange: this.dsaveCode,
          options: {
            viewportMargin: Infinity,
            mode: 'javascript',
            theme: 'material'
          }
        })
      ])
    )
  }

  saveCode (editor, data, code) {
    this.props.save(code)
  }
}
