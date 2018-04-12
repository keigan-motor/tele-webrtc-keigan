/*!jQuery Kontrol*/
/**
 * info::edit XYのみ使用
 * Small extensible jQuery library of new UI controls ;
 * Dial (was jQuery Knob), XY pad, Bars.
 *
 * Version: 0.9.0 (15/07/2012)
 * Requires: jQuery v1.7+
 *
 * Copyright (c) 2012 Anthony Terrien
 * Under MIT and GPL licenses:
 *  http://www.opensource.org/licenses/mit-license.php
 *  http://www.gnu.org/licenses/gpl.html
 *
 * Thanks to vor, eskimoblood, spiffistan, FabrizioC
 */
(function($) {
    
    /**
     * Kontrol library
     */
    "use strict";

    /**
     * Definition of globals and core
     */
    var k = {}, // kontrol
        max = Math.max,
        min = Math.min;

    k.c = {};
    k.c.d = $(document);
    k.c.t = function (e) {
        return e.originalEvent.touches.length - 1;
    };

    /**
     * Kontrol Object
     *
     * Definition of an abstract UI control
     *
     * Each concrete component must call this one.
     * <code>
     * k.o.call(this);
     * </code>
     */
    k.o = function () {
        var s = this;

        this.o = null; // array of options
        this.$ = null; // jQuery wrapped element
        this.i = null; // mixed HTMLInputElement or array of HTMLInputElement
        this.g = null; // 2D graphics context for 'pre-rendering'
        this.v = null; // value ; mixed array or integer
        this.cv = null; // change value ; not commited value
        this.x = 0; // canvas x position
        this.y = 0; // canvas y position
        this.mx = 0; // x value of mouse down point of the current mouse move
        this.my = 0; // y value of mouse down point of the current mose move
        this.$c = null; // jQuery canvas element
        this.c = null; // rendered canvas context
        this.t = 0; // touches index
        this.isInit = false;
        this.fgColor = null; // main color
        this.pColor = null; // previous color
        this.sH = null; // start hook
        this.dH = null; // draw hook
        this.cH = null; // change hook
        this.eH = null; // cancel hook
        this.rH = null; // release hook

        this.tuch_start_x=0;//タッチダウンの開始座標
        this.tuch_start_y=0;

        this.run = function () {
            var cf = function (e, conf) {
                var k;
                for (k in conf) {
                    s.o[k] = conf[k];
                }
                s.init();
                s._configure()
                 ._draw();
            };

            if(this.$.data('kontroled')) return;
            this.$.data('kontroled', true);

            this.extend();
            this.o = $.extend(
                {
                    // Config
                    min : this.$.data('min') || 0,
                    max : this.$.data('max') || 100,
                    stopper : true,
                    readOnly : this.$.data('readonly'),
                    noScroll : this.$.data('noScroll'),

                    // UI
                    cursor : (this.$.data('cursor') === true && 30)
                                || this.$.data('cursor')
                                || 0,
                    thickness : this.$.data('thickness') || 0.35,
                    width : this.$.data('width') || 200,
                    height : this.$.data('height') || 200,
                    displayInput : this.$.data('displayinput') == null || this.$.data('displayinput'),
                    displayPrevious : this.$.data('displayprevious'),
                    fgColor : this.$.data('fgcolor') || '#87CEEB',
                    inline : false,
                    //context : {'lineCap' : 'butt'},

                    // Hooks
                    start:null,  // function () {}
                    draw : null, // function () {}
                    change : null, // function (value) {}
                    cancel : null, // function () {}
                    release : null // function (value) {}
                }, this.o
            );

            // routing value
            if(this.$.is('fieldset')) {

                // fieldset = array of integer
                this.v = {};
                this.i = this.$.find('input');
                this.i.each(function(k) {
                    var $this = $(this);
                    s.i[k] = $this;
                    s.v[k] = $this.val();

                    $this.bind(
                        'change'
                        , function () {
                            var val = {};
                            val[k] = $this.val();
                            s.val(val);
                        }
                    );
                });
                this.$.find('legend').remove();

            } else {
                // input = integer
                this.i = this.$;
                this.v = this.$.val();
                (this.v == '') && (this.v = this.o.min);

                this.$.bind(
                    'change'
                    , function () {
                        s.val(s.$.val());
                    }
                );
            }

            (!this.o.displayInput) && this.$.hide();

            this.$c = $('<canvas width="' + this.o.width + 'px" height="' +this.o.height + 'px"></canvas>');
            this.c = this.$c[0].getContext("2d");

            this.$
                .wrap($('<div style="' + (this.o.inline ? 'display:inline;' : '') +
                        'width:' + this.o.width + 'px;height:' +
                        this.o.height + 'px;"></div>'))
                .before(this.$c);

            if (this.v instanceof Object) {
                this.cv = {};
                this.copy(this.v, this.cv);
            } else {
                this.cv = this.v;
            }

            this.$
                .bind("configure", cf)
                .parent()
                .bind("configure", cf);

            this._listen()
                ._configure()
                ._xy()
                .init();

            this.isInit = true;

            this._draw();

            return this;
        };

        this._draw = function () {

            // canvas pre-rendering
            var d = true,
                c = document.createElement('canvas');

            c.width = s.o.width;
            c.height = s.o.height;
            s.g = c.getContext('2d');

            s.clear();

            s.dH
            && (d = s.dH());

            (d !== false) && s.draw();

            s.c.drawImage(c, 0, 0);
            c = null;
        };

        this._touch = function (e) {

            var touchMove = function (e) {

                var v = s.xy2val(
                            e.originalEvent.touches[s.t].pageX,
                            e.originalEvent.touches[s.t].pageY,
                            'touch'
                            );

                if (v == s.cv) return;

                if (
                    s.cH
                    && (s.cH(v) === false)
                ) return;


                s.change(v);
                s._draw();
            };

            // get touches index
            this.t = k.c.t(e);

            if (
                this.sH
                && (this.sH() === false)
            ) return;

            // First touch
            touchMove(e);

            // Touch events listeners
            k.c.d
                .bind("touchmove.k", touchMove)
                .bind(
                    "touchend.k"
                    , function () {
                        k.c.d.unbind('touchmove.k touchend.k');

                        if (
                            s.rH
                            && (s.rH(s.cv) === false)
                        ) return;

                        s.val(s.cv);
                    }
                );

            return this;
        };

        this._mouse = function (e) {

            var mouseMove = function (e) {
                var v = s.xy2val(e.pageX, e.pageY, 'mouse');
                if (v == s.cv) return;

                if (
                    s.cH
                    && (s.cH(v) === false)
                ) return;

                s.change(v);
                s._draw();
            };

            if (
                this.sH
                && (this.sH() === false)
            ) return;

            // First click
            s.mx = e.pageX;
            s.my = e.pageY;
            mouseMove(e);

            // Mouse events listeners
            k.c.d
                .bind("mousemove.k", mouseMove)
                .bind(
                    // Escape key cancel current change
                    "keyup.k"
                    , function (e) {
                        if (e.keyCode === 27) {
                            k.c.d.unbind("mouseup.k mousemove.k keyup.k");

                            if (
                                s.eH
                                && (s.eH() === false)
                            ) return;

                            s.cancel();
                        }
                    }
                )
                .bind(
                    "mouseup.k"
                    , function (e) {
                        k.c.d.unbind('mousemove.k mouseup.k keyup.k');

                        if (
                            s.rH
                            && (s.rH(s.cv) === false)
                        ) return;

                        s.val(s.cv);
                    }
                );

            return this;
        };

        this._xy = function () {
            var o = this.$c.offset();
            this.x = o.left;
            this.y = o.top;
            return this;
        };

        this._listen = function () {
            var self=this;
            if (!this.o.readOnly) {
                this.$c
                    .bind(
                        "mousedown"
                        , function (e) {
                            e.preventDefault();
                            s._xy()._mouse(e);
                            var tt=s._xy();
                            self.tuch_start_x=tt.m[0];
                            self.tuch_start_y=tt.m[1];
                         }
                    )
                    .bind(
                        "touchstart"
                        , function (e) {
                            e.preventDefault();
                            s._xy()._touch(e);
                            var tt=s._xy();
                            //console.log("touchstart "+self.tuch_start_x+","+self.tuch_start_y);
                            self.tuch_start_x=tt.m[0];
                            self.tuch_start_y=tt.m[1];
                           //console.log(tt.cv[0],tt.cv[1],tt.m[0],tt.m[1]);
                           // console.log(self.tuch_start_x,self.tuch_start_y);
                         }
                    );
                this.listen();
            } else {
                this.$.attr('readonly', 'readonly');
            }

            return this;
        };

        this._configure = function () {

            // Hooks
            if (this.o.start) this.sH = this.o.start;
            if (this.o.draw) this.dH = this.o.draw;
            if (this.o.change) this.cH = this.o.change;
            if (this.o.cancel) this.eH = this.o.cancel;
            if (this.o.release) this.rH = this.o.release;

            if (this.o.displayPrevious) {
                this.pColor = this.h2rgba(this.o.fgColor, "0.4");
                this.fgColor = this.h2rgba(this.o.fgColor, "0.6");
            } else {
                this.fgColor = this.o.fgColor;
            }

            return this;
        };

        this._clear = function () {
            this.$c[0].width = this.$c[0].width;
        };

        // Abstract methods
        this.listen = function () {}; // on start, one time
        this.extend = function () {}; // each time configure triggered
        this.init = function () {}; // each time configure triggered
        this.change = function (v) {}; // on change
        this.val = function (v) {}; // on release
        this.xy2val = function (x, y, method) {}; //
        this.draw = function () {}; // on change / on release
        this.clear = function () { this._clear(); };

        // Utils
        this.h2rgba = function (h, a) {
            var rgb;
            h = h.substring(1,7)
            rgb = [parseInt(h.substring(0,2),16)
                   ,parseInt(h.substring(2,4),16)
                   ,parseInt(h.substring(4,6),16)];
            return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")";
        };

        this.copy = function (f, t) {
            for (var i in f) { t[i] = f[i]; }
        };
    };




    /**
     * k.XY
     */
    k.XY = function () {
        k.o.call(this);

        this.m = [];
        this.p = [];
        this.f = []; // factor
        this.s = {0:1,1:-1};
        this.cur2 = 0;
        this.cursor = 0;
        this.v = {};
        this.div = null;

        this.extend = function () {
            this.o = $.extend(
                {
                    min : this.$.data('min') || 0,
                    max : this.$.data('max') || 100,
                    // width : this.$.data('width') || 200,
                    // height : this.$.data('height') || 200
                    width : this.width || 200,
                    height : this.height || 200
                }, this.o
            );
        };

        this._coord = function() {
            for(var i in this.v) {
                this.m[i] = ~~ (0.5 + ((this.s[i] * this.v[i] - this.o.min) / this.f[i]) + this.cur2) ;
                this.p[i] = this.m[i];
            }
        };

        this.init = function () {
            this.cursor = this.o.cursor || 30;
            this.cur2 = this.cursor / 2;

            this.f[0] = (this.o.max - this.o.min) / (this.o.width - this.cursor);
            this.f[1] = (this.o.max - this.o.min) / (this.o.height - this.cursor);

            if (!this.isInit) {
                this._coord();
            }

            if(this.o.displayInput) {
                var s = this;
                this.$.css({
                        'margin-top' : '-30px'
                        , 'border' : 0
                        , 'font' : '11px Arial'
                        });

                this.i.each(
                    function (){
                        $(this).css({
                            'width' : (s.o.width /4) + 'px'
                            ,'border' : 0
                            ,'background' : 'none'
                            ,'color' : s.o.fgColor
                            ,'padding' : '0px'
                            ,'-webkit-appearance': 'none'
                            });
                    });
            } else {
                this.$.css({
                        'width' : '0px'
                        ,'visibility' : 'hidden'
                        });
            }
        };

        this.xy2val = function (x, y) {
            this.m[0] = max(this.cur2, min(x - this.x, this.o.width - this.cur2));
            this.m[1] = max(this.cur2, min(y - this.y, this.o.height - this.cur2));

            return {
                0 : ~~ (this.o.min + (this.m[0] - this.cur2) * this.f[0]),
                1 : ~~ (this.o.min + (this.o.height - this.m[1] - this.cur2) * this.f[1])
            };
        };
        //値＞座標の逆関数
        this.valxy2 = function (x, y) {
            return {
                //0 : ~~(x-this.o.min)/this.f[0] +this.cur2+this.x,
               // 1 : ~~(this.o.min-y)/this.f[1] +this.o.height-this.cur2+this.y
                0 : ~~(x-this.o.min) /this.f[0]+this.cur2,
                1 : ~~(this.o.min-y) /this.f[1]+this.o.height-this.cur2
            };
        };

        this.change = function (v) {
            this.cv = v;
            this.i[0].val(this.cv[0]);
            this.i[1].val(this.cv[1]);
        };

        this.val = function (v) {
            if (null !== v) {
                this.cv = v;
                this.copy(this.cv, this.v);
                this._coord();
                this._draw();
            } else {
                return this.v;
            }
        };

        this.cancel = function () {
            this.copy(this.v, this.cv);
            this.i[0].val(this.cv[0]);
            this.i[1].val(this.cv[1]);
            this.m[0] = this.p[0];
            this.m[1] = this.p[1];
            this._draw();
        };

        this.draw = function () {

            var c = this.g
                , r = 1;

            if (this.o.displayPrevious) {
                c.beginPath();
                c.lineWidth = this.cursor;
                c.strokeStyle = this.pColor;
                c.moveTo(this.p[0], this.p[1] + this.cur2);
                c.lineTo(this.p[0], this.p[1] - this.cur2);
                c.stroke();
                r = (this.cv[0] == this.v[0] && this.cv[1] == this.v[1]);
            }

            c.beginPath();
            c.lineWidth = this.cursor;
            c.strokeStyle = r  ? this.o.fgColor : this.fgColor;
            c.moveTo(this.m[0], this.m[1] + this.cur2);
            c.lineTo(this.m[0], this.m[1] - this.cur2);
            c.stroke();

        };
    };

    $.fn.xy = function (o) {
        return this.each(
            function () {
                var x = new k.XY();
                x.$ = $(this);
                x.o = o;
                x.run();
            }
        ).parent();
    };



})(jQuery);