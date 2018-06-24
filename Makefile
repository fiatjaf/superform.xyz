all: bundle.css bundle.js

bundle.css: style.styl
	stylus style.styl -o bundle.css

bundle.js: $(shell ag --ignore bundle.js --js -l)
	node_modules/.bin/browserifyinc -vd app.js -o bundle.js
