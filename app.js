/* global firebase */

const React = require('react')
const h = require('react-hyperscript')
const render = require('react-dom').render
const page = require('page')
const SplitterLayout = require('react-splitter-layout').default
const cuid = require('cuid')

const View = require('./View')
const Entries = require('./Entries')
const Code = require('./Code')

firebase.initializeApp({
  apiKey: 'AIzaSyBnsHuekLxCqbVSyb_np7j0Yn5jJK5QFpw',
  authDomain: 'superform-xyz.firebaseapp.com',
  databaseURL: 'https://superform-xyz.firebaseio.com',
  projectId: 'superform-xyz',
  storageBucket: 'superform-xyz.appspot.com',
  messagingSenderId: '736573438203'
})

const db = firebase.firestore()
db.settings({
  timestampsInSnapshots: true
})

class App extends React.Component {
  constructor () {
    super()

    this.state = {
      user: null,
      form: null,
      entries: []
    }

    this.cancel = []
  }

  componentWillMount () {
    this.cancelListeners()
  }

  componentDidMount () {
    page('/', () => {
      this.cancelListeners()

      this.setState({
        form: null,
        entries: []
      })

      this.formRef = null
      this.entriesRef = null

      page(`/edit/${cuid.slug()}`)
    })

    page('/edit/:form', ctx => {
      this.cancelListeners()

      this.formRef = db.doc('forms/' + ctx.params.form)
      this.entriesRef = this.formRef.collection('entries')

      this.cancel.push(this.formRef.onSnapshot(f => {
        let form = f.exists
          ? f.data()
          : {
            owner: null,
            code: `// define your view and reduce functions here.

module.exports.view = function (element) {
  
}

module.exports.reduce = function (state, entry) {
  
}
            `
          }
        this.setState({form})
      }))

      this.cancel.push(this.entriesRef.orderBy('created_at', 'desc').onSnapshot(e => {
        this.setState({
          entries: e.docs.map(d => {
            let entry = d.data()
            entry.created_at = entry.created_at.toDate()
            entry.updated_at = entry.updated_at && entry.updated_at.toDate()
            return entry
          })
        })
      }))

      firebase.auth().onAuthStateChanged(user => {
        this.setState({user})
      })
    })

    page({
      hashbang: true
    })

    firebase.auth().getRedirectResult()
  }

  cancelListeners () {
    this.cancel.forEach(c => c())
    this.cancel = []
  }

  render () {
    return (
      h('div', [
        h('nav', this.state.user
          ? `Logged in as ${this.state.user.email}`
          : [
            ['Google', new firebase.auth.GoogleAuthProvider()],
            ['Twitter', new firebase.auth.TwitterAuthProvider()],
            ['GitHub', new firebase.auth.GithubAuthProvider()]
          ].map(([name, provider]) =>
            h('a', {
              onClick: () => {
                firebase.auth().signInWithPopup(provider)
              }
            }, 'Sign in with ' + name),
          )),
        this.state.form && this.state.entries &&
          h(SplitterLayout, [
            h(View, {
              code: this.state.form.code,
              entries: this.state.entries,
              addEntry: entry => this.addEntry(entry)
            }),
            h(SplitterLayout, {vertical: true}, [
              h(Entries, {
                entries: this.state.entries
              }),
              h(Code, {
                code: this.state.form.code,
                save: code => this.saveForm(code)
              })
            ])
          ])
      ])
    )
  }

  saveForm (code) {
    let formData = {
      author: this.state.user.uid,
      created_at: firebase.firestore.Timestamp.now(),
      code
    }
    this.formRef.set(formData)
  }

  addEntry (entry) {
    entry.submitter = this.state.user.uid
    entry.created_at = firebase.firestore.Timestamp.now()

    this.entriesRef.add(entry)
  }
}

render(
  h(App),
  document.getElementById('root')
)
