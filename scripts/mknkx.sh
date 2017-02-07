
# setup

mkdir out || cd lib

# browserify

browserify ./jsdom_nkx.js -o ../out/jsdom_nkx_pack.js
browserify -r ./ui8p.js -o ../out/ui8p_pack.js

# Return
cd ..

# Transpile
babel out/jsdom_nkx_pack.js -o out/jsdom_nkx.js

# Compress
uglifyjs out/jsdom_nkx.js -o out/jsdom_nkx.min.js -c
