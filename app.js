/* global firebase */

const React = require('react')
const h = require('react-hyperscript')
const render = require('react-dom').render
const page = require('page')
const SplitterLayout = require('react-splitter-layout').default
const cuid = require('cuid')
const debounce = require('debounce')
const gravatar = require('gravatar-url')

const View = require('./View')
const Entries = require('./Entries')
const Code = require('./Code')
const UI = require('./UI')
const {n_error, n_success} = require('./helpers')

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

const LANDING = 'landing'
const ALL_FORMS = 'forms'
const SINGLE_FORM = 'form'

class App extends React.Component {
  constructor () {
    super()

    this.state = {
      page: LANDING,

      user: null,
      userforms: [],
      form: null,
      editing: false,
      entries: []
    }

    this.formsRef = db.collection('forms')
    this.formRef = null
    this.entriesRef = null

    this.cancelFormsListener = () => {}
    this.cancelFormListener = () => {}
    this.cancelEntriesListener = () => {}

    this.secondarySizes = JSON.parse(
      localStorage.getItem('secondary-panel-sizes') ||
      '[50, 0, 0]'
    )

    this.dpanelSizeChanged = debounce(this.panelSizeChanged, 700)
  }

  componentWillUnmount () {
    this.cancel.forEach(c => c())
    this.cancel = []
  }

  componentDidMount () {
    page('/', () => {
      this.setState({page: LANDING})
    })

    page('/forms', () => {
      this.setState({page: ALL_FORMS})
    })

    page('/new', () => {
      this.setState({
        form: null,
        entries: []
      })

      page(`/edit/${cuid.slug()}`)
    })

    page('/:action/:form', ctx => {
      this.setState({page: SINGLE_FORM})

      if (ctx.params.action === 'view') {
        this.setState({editing: false})
      } else if (ctx.params.action === 'edit') {
        this.setState({editing: true})
      } else {
        return
      }

      this.formRef = this.formsRef.doc(ctx.params.form)
      this.entriesRef = this.formRef.collection('entries')

      this.cancelFormListener = this.formRef.onSnapshot(f => {
        let form = f.exists
          ? f.data()
          : {
            owner: null,
            created_at: firebase.firestore.Timestamp.now(),
            code: `exports.reduce = function (state, entry) {
  switch (entry.type) {
    case 'normal_submission':
      state.submissions.push(entry.content)
      break
  }
}

exports.init = function () {
  return {
    submissions: []
  }
}`,
            ui: `
div
  h1 Hello, #{user.email}!
  p These are the last submissions we have:
  +list(state.submissions)
  div
    h3 Submit a new thing
    form
      +value('type', 'normal_submission')
      +field('content', 'Content')
      button 'Ok'
`
          }
        this.setState({form})
      })

      this.cancelEntriesListener = this.entriesRef.orderBy('created_at', 'asc')
        .onSnapshot(e => {
          this.setState({
            entries: e.docs.map(d => {
              let entry = d.data()
              entry.created_at = entry.created_at.toDate()
              entry.updated_at = entry.updated_at && entry.updated_at.toDate()
              entry.id = d.id
              return entry
            })
          })
        })
    })
    page.exit('/:action/:form', () => {
      this.cancelFormListener()
      this.cancelEntriesListener()
    })

    page()

    firebase.auth().onAuthStateChanged(user => {
      this.cancelFormsListener()

      if (!user) {
        this.setState({user: null})
        return
      }

      this.setState(st => {
        st.user = user

        if (st.form && st.form.owner === null) {
          st.form.owner = user.uid
        }

        return st
      })

      this.cancelFormsListener = this.formsRef.onSnapshot(e => {
        this.setState({
          userforms: e.docs.map(d => Object.assign(d.data(), {id: d.id}))
        })
      })
    })

    firebase.auth().getRedirectResult()
  }

  render () {
    let secondarySizes = this.state.editing ? this.secondarySizes : [0, 0, 50]

    var body
    switch (this.state.page) {
      case SINGLE_FORM:
        body = this.state.form && this.state.entries &&
          h(SplitterLayout, {
            percentage: true,
            secondaryInitialSize: secondarySizes[0],
            onSecondaryPaneSizeChange: s => this.dpanelSizeChanged(0, s)
          }, [
            h(SplitterLayout, {
              vertical: true,
              percentage: true,
              secondaryInitialSize: secondarySizes[1],
              onSecondaryPaneSizeChange: s => this.dpanelSizeChanged(1, s),
              customClassName: 'view-splitter'
            }, [
              h(View, {
                code: this.state.form.code,
                ui: this.state.form.ui,
                entries: this.state.entries,
                user: {
                  uid: this.state.user.uid,
                  email: this.state.user.email,
                  name: this.state.user.displayName
                },
                addEntry: data => this.addEntry(data)
              }),
              h(Entries, {
                entries: this.state.entries,
                editEntry: (id, data) => this.editEntry(id, data),
                deleteEntry: id => this.deleteEntry(id)
              })
            ]),
            h(SplitterLayout, {
              vertical: true,
              percentage: true,
              secondaryInitialSize: secondarySizes[2],
              onSecondaryPaneSizeChange: s => this.dpanelSizeChanged(2, s)
            }, [
              h(UI, {
                code: this.state.form.ui,
                save: ui => this.saveForm({ui})
              }),
              h(Code, {
                code: this.state.form.code,
                save: code => this.saveForm({code})
              })
            ])
          ])
        break
      case LANDING:
        body = null
        break
      case ALL_FORMS:
        body = h('ul', this.state.userforms.map(f =>
          h('li', [
            h('a', {href: `/edit/${f.id}`}, f.id)
          ])
        ))
        break
    }

    return (
      h('div', [
        h('.nav', [
          h('.logo', [
            h('div', [
              h('img', {src: '/icon.png'})
            ]),
            h('h1', 'Superform')
          ]),
          h('.user', this.state.user
            ? [
              h('a', {href: '/forms'}, [
                h('img', {
                  src: gravatar(this.state.user.email, {
                    size: 270,
                    default: `https://robohash.org/${this.state.user.uid}.png`
                  })
                })
              ])
            ]
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
            )
          )
        ]),
        body
      ])
    )
  }

  panelSizeChanged (index, size) {
    if (this.state.editing) {
      this.secondarySizes[index] = size
      localStorage.setItem(
        'secondary-panel-sizes',
        JSON.stringify(this.secondarySizes)
      )
    }
  }

  saveForm (data) {
    this.formRef.set(Object.assign(this.state.form, data))
      .catch(e => {
        n_error('Failed to save form. See console for more details.')
        console.warn('failed to save form:', e)
      })
  }

  addEntry (data) {
    this.entriesRef.add({
      submitter: this.state.user && this.state.user.uid,
      created_at: firebase.firestore.Timestamp.now(),
      data
    })
      .then(() => {
        n_success('Created entry successfully.')
      })
      .catch(e => {
        n_error('Failed to create entry. See console for more details.')
        console.warn('failed to create entry:', e)
      })
  }

  editEntry (id, data) {
    this.entriesRef.doc(id).set({
      data,
      updated_at: firebase.firestore.Timestamp.now()
    }, {merge: true})
      .then(() => {
        n_success('Updated entry successfully.')
      })
      .catch(e => {
        n_error('Failed to update entry. See console for more details.')
        console.warn('failed to update entry:', e)
      })
  }

  deleteEntry (id) {
    this.entriesRef.doc(id).delete()
      .then(() => {
        n_success('Deleted entry successfully.')
      })
      .catch(e => {
        n_error('Failed to delete entry. See console for more details.')
        console.warn('failed to delete entry:', e)
      })
  }
}

render(
  h(App),
  document.getElementById('app')
)
