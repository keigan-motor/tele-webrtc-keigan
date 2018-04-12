//-------------------------------------------------------------//
//
//section::XYドラッグUI
//
//-------------------------------------------------------------//
//UI入力モード　相対 中央固定（テレプレ用）
UI_INPUT_MODE={
    RELATIVE:0,
    CENTER_FIXED:1
};
/**
 * コンストラクター
 * @param Opusions
 * @param ParentDOM
 */
function inputctl_XYPad(set_opusions,ParentDOM){
    let Opusions={
            device_name:null
            ,min_move_dist:30
            ,max_move_dist:150
            ,UIInput_watch_time:100
            ,UIInput_mode:UI_INPUT_MODE.RELATIVE
            ,OnChangePoint:function(vector2,xy_vector2){}
        };

    $.extend(Opusions,set_opusions);
    let DeviceName=Opusions.device_name;
    let InputSeekIntervalCnt={val:0};//入力から取得する値の取得間隔
    let inputctl_XYPad_jq=$('<div class="inputctl_XYPad"></div>');

    let pad_jq = $('<fieldset class="inputctl_XYPad_Pad" ><legend>XY Pad</legend><input name="x" value=0><input name="y" value=0></fieldset>');
    pad_jq.css({display:'none'});//パッド内に数値を表示しない設定
    let ct_jq=$('<div class="InputSeekIntervalCntSW fa fa-2x fa-plug" aria-hidden="true"></div>');//UIの取得間隔通知ランプ

    let _vector2=new KMVector2();
    let _fastflg=false;
    let _centerfix_flg=false;//中央固定モードでセンター（起点）をタップしたか
    let _tuchflg=false;
    let _min_move_dist_color='rgba(56, 153, 187,0.5)';//最小範囲の円の色
    let _max_move_dist_color='rgba(56, 153, 187,0.5)';//最台範囲の円の色
    let _line_color='rgb(255, 39, 0)';//ベクトルの色
    let start_p=[0,0];
    //--------------------//
    //section::入力イベントハンドラ
    //--------------------//
    /**
     * UIからの値反映
     * min_move_dist以上ドラッグしたら、max_move_distを最大として、その方向分のベクトルを算出する
     * @param ui_val
     * @constructor
     */
    let OnUIInputValChangeLisner=function (xy_val_obj){
        let now=new KMVector2(xy_val_obj[0],xy_val_obj[1]);//現在の位置
        let min_dist=Opusions.min_move_dist;
        let max_dist=Opusions.max_move_dist;
        // console.log("now:"+now.x+","+now.y);
        switch(Opusions.UIInput_mode){
            case UI_INPUT_MODE.RELATIVE://相対モード
                if(_fastflg){
                    _vector2.x=xy_val_obj[0];
                    _vector2.y=xy_val_obj[1];//タッチ地点の登録
                    let s_p= this.valxy2(_vector2.x,_vector2.y);//canvas座標に変換
                    start_p[0]=s_p[0];
                    start_p[1]=s_p[1];
                    _fastflg=false;
                    InputSeekIntervalCnt.val=0;//最初に取得してから検出範囲まではタイムラグ無しで行う
                    Opusions.OnChangePoint(new KMVector2(),new KMVector2());
                    return;
                }

                break;
            case UI_INPUT_MODE.CENTER_FIXED://中央固定モード
                if(_fastflg){
                    _vector2.x=0;
                    _vector2.y=0;//タッチ地点の登録
                    let s_p= this.valxy2(_vector2.x,_vector2.y);//canvas座標に変換
                    start_p[0]=s_p[0];
                    start_p[1]=s_p[1];
                    _fastflg=false;
                    //0点から(min_move_dist)以内を起点としてタップしていないと無効（処理しない）
                    let _ini_dist=_vector2.Distance(now);//0地点からのタッチの距離
                    if(_ini_dist>min_dist){
                        _centerfix_flg=false;
                        return;
                    };

                    _centerfix_flg=true;
                    InputSeekIntervalCnt.val=0;//最初に取得してから検出範囲まではタイムラグ無しで行う
                    Opusions.OnChangePoint(new KMVector2(),new KMVector2());

                    return;
                }
                if(!_centerfix_flg){
                    return;
                }
                break;
        };

        //最小移動距離の閾値以下は無視
        let rad=_vector2.Radian(now);//タッチ地点からの角度
        let dist=_vector2.Distance(now);//タッチ地点からの距離
        if(dist<min_dist){
            InputSeekIntervalCnt.val=0;
            return;
        }
        dist=dist>max_dist?max_dist:dist;


        //取得間隔以内の入力はUI以外に通知しない
        let utime=(+new Date());//UNIXTIME ShortCode
        if(utime-InputSeekIntervalCnt.val < Opusions.UIInput_watch_time){
            ct_jq.toggleClass("on",false);
            // console.log("取得間隔以内 ");
            return;
        }
        InputSeekIntervalCnt.val=utime;
        //移動座標を算出。 最小移動距離の境界を0、最大移動距離を1として座標を正規化
        //info::もっと簡単な計算に出来るハズ
        let sd=(dist-min_dist)/(max_dist-min_dist)*-1;//最小-最大間で正規化した距離
        let u=new KMVector2(Math.cos(rad)*sd,Math.sin(rad)*sd);
        // console.log("sd:"+sd+" u_x:"+u.x+" u_y"+u.y);
        Opusions.OnChangePoint(u,_vector2.Clone());
        ct_jq.toggleClass("on",true);
    };

    // -------------------//
    // section::init
    //--------------------//
    let r_jq=$('<div style="display: inline-block;border:5px solid #BBB"></div>').append(pad_jq);
    inputctl_XYPad_jq.append(r_jq).append(ct_jq);
    $(ParentDOM).append(inputctl_XYPad_jq);

    let w=$(ParentDOM).width()-8;//data-width="'+w+'" data-height="'+w+'"
    let h=$(ParentDOM).height()-8;
    pad_jq.xy({
        displayPrevious:false
        , min : -100
        , max : 100
        ,width:w
        ,height:h
        , cursor:1
        , fgColor:"#222222"
        , bgColor:"#EEEEEE"

        ,start:function () {//タッチダウン
            _fastflg=true;
            _tuchflg=true;
        }
        ,change : OnUIInputValChangeLisner
        ,release:function () {//タッチアップ
            _vector2.x=_vector2.y=0;
            _fastflg=false;
            _tuchflg=false;
            _centerfix_flg=false;
            Opusions.OnChangePoint(new KMVector2(),new KMVector2());//停止
            //console.log("release : ");
        }

        ,draw:function () {

            //console.log("tuch_start_x "+this.tuch_start_x+","+this.tuch_start_y);
            //タッチダウン時のスタートの最小範囲円と最大範囲円・ベクトルラインの描画
            if(_tuchflg){
                let graphic=this.g;
                graphic.beginPath();
                graphic.fillStyle = _min_move_dist_color;
                graphic.arc(start_p[0],start_p[1],Opusions.min_move_dist,0,Math.PI*2,false);
                graphic.fill();

                graphic.beginPath();
                graphic.strokeStyle = _max_move_dist_color;
                graphic.arc(start_p[0],start_p[1],Opusions.max_move_dist,0,Math.PI*2,false);
                graphic.stroke();

                graphic.beginPath();
                graphic.lineWidth=2;
                graphic.strokeStyle = _line_color;
                // graphic.moveTo(_graph_pt[0],_graph_pt[1]);
                graphic.moveTo(start_p[0],start_p[1]);
                graphic.lineTo(this.m[0],this.m[1]);
                graphic.stroke();
            }else{
                //タッチアップ時の描画を消去
                this.clear();
                switch(Opusions.UIInput_mode){
                    case UI_INPUT_MODE.CENTER_FIXED://中央固定モード
                        let st= this.valxy2(_vector2.x,_vector2.y);
                        start_p[0]=st[0];
                        start_p[1]=st[1];
                        let graphic=this.g;
                        graphic.beginPath();
                        graphic.fillStyle = _min_move_dist_color;
                        graphic.arc(start_p[0],start_p[1],Opusions.min_move_dist,0,Math.PI*2,false);
                        graphic.fill();
                        break;
                }

            }

        }

    });//info::border*2 分だけ座標がズレる;
}


