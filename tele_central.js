'use strict';
$(function() {
    const CONTROLLER_TYPE={'PAD':0,'SWIPE':1};
    const MOVE_TYPE={'RUN':0,'POSITION':1};
    let conID =UTL_load_storage("conID");
    conID=!conID?null:conID;
    //------------------------------
    // section::SkyWay WEBRTC
    //------------------------------

    // Peer object
    const peer = new Peer(conID,{
        key:   window.__SKYWAY_KEY__,
        debug: 3,
    });

    let localStream;
    let existingCall;
    let dataConnection;

    peer.on('open', () => {
        $('#my-id').text(peer.id);
        UTL_save_storage("conID",peer.id);
        step1();
    });

    // Receiving a call
    peer.on('call', call => {
        call.answer(localStream);
        step3(call);
    });

    peer.on('error', err => {
        alert(err.message);
        step2();
    });

    peer.on('disconnected', function(){
        moveStop();
    });

    peer.on('connection', (connection) => {
        dataConnection=connection;
        dataConnection.on('data',function(data){
            if(typeof data !=="object"){return;}
            switch (data.controllerType){
                case CONTROLLER_TYPE.PAD:
                    moveVector(new KMVector2(data.x,data.y),MOVE_TYPE.RUN);
                    break;
                case CONTROLLER_TYPE.SWIPE:
                    moveVector(new KMVector2(data.x,data.y),MOVE_TYPE.POSITION);
                    break;
            }
        });
    });



    $('#make-call').on('submit', e => {
        e.preventDefault();
        // Initiate a call!
        console.log($('#callto-id').val());
        const call = peer.call($('#callto-id').val(), localStream);
        step3(call);
    });

    $('#end-call').on('click', () => {
        existingCall.close();
        step2();
    });

    // Retry if getUserMedia fails
    $('#step1-retry').on('click', () => {
        $('#step1-error').hide();
        step1();
    });

    // set up audio and video input selectors
    const audioSelect = $('#audioSource');
    const videoSelect = $('#videoSource');
    const selectors = [audioSelect, videoSelect];

    navigator.mediaDevices.enumerateDevices()
        .then(deviceInfos => {
            const values = selectors.map(select => select.val() || '');
            selectors.forEach(select => {
                const children = select.children(':first');
                while (children.length) {
                    select.remove(children);
                }
            });

            for (let i = 0; i !== deviceInfos.length; ++i) {
                const deviceInfo = deviceInfos[i];
                const option = $('<option>').val(deviceInfo.deviceId);

                if (deviceInfo.kind === 'audioinput') {
                    option.text(deviceInfo.label ||
                        'Microphone ' + (audioSelect.children().length + 1));
                    audioSelect.append(option);
                } else if (deviceInfo.kind === 'videoinput') {
                    option.text(deviceInfo.label ||
                        'Camera ' + (videoSelect.children().length + 1));
                    videoSelect.append(option);
                }
            }

            selectors.forEach((select, selectorIndex) => {
                if (Array.prototype.slice.call(select.children()).some(n => {
                        return n.value === values[selectorIndex];
                    })) {
                    select.val(values[selectorIndex]);
                }
            });

            videoSelect.on('change', step1);
            audioSelect.on('change', step1);
        });

    function step1() {
        // Get audio/video stream
        const audioSource = $('#audioSource').val();
        const videoSource = $('#videoSource').val();
        const constraints = {
            audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
            video: {deviceId: videoSource ? {exact: videoSource} : undefined},
        };

        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            $('#my-video').get(0).srcObject = stream;
            localStream = stream;

            if (existingCall) {
                existingCall.replaceStream(stream);
                return;
            }

            step2();
        }).catch(err => {
            $('#step1-error').show();
            console.error(err);
        });
    }

    function step2() {
        $('#step1, #step3').hide();
        $('#step2').show();
        $('#callto-id').focus();
    }

    function step3(call) {
        // Hang up on an existing call if present
        if (existingCall) {
            existingCall.close();
        }
        // Wait for stream on the call, then set peer video display
        call.on('stream', stream => {
            const el = $('#their-video').get(0);
            el.srcObject = stream;
            el.play();
        });

        call.on('data', (data)=>{
            console.log(data);
        });

        // UI stuff
        existingCall = call;
        //$('#their-id').text(call.remoteId);
        call.on('close', step2);
        $('#step1, #step2').hide();
        $('#step3').show();
    }

    //////////////////////

    //------------------------------
    // section::API初期化と各種イベントバインド
    //------------------------------
    let moveStopIntervalID=0;

    let motorLeft=new KMMotorOneWebBLE();
    let motorRight=new KMMotorOneWebBLE();
    let motorLeftBeforRotState=new KMRotState();
    let motorRightBeforRotState=new KMRotState();

    let motorLeftRevers=true;
    let motorRightRevers=false;
    let padXYSwap=UTL_load_storage("padXYSwap");

    let maxSpeed=50;
    let distRatio=1;

    let $motorLeftStatusTxt=$('#motorLeftStatusTxt');
    let $motorRightStatusTxt=$('#motorRightStatusTxt');

    $('#motorLeftReversBtn').toggleClass("on",motorLeftRevers);
    $('#motorRightReversBtn').toggleClass("on",motorRightRevers);
    $('#padXYSwapBtn').toggleClass("on",padXYSwap);
    $('#maxSpeedBtn')[0].max=maxSpeed;
    $('#maxSpeedBtn')[0].value=maxSpeed/2;

    motorLeft.on(motorLeft.EVENT_TYPE.connect,(kMDeviceInfo)=>{
        console.log("onConnect:"+kMDeviceInfo.isConnect);
        $('#motorLeftStatus').toggleClass("enable",true);
        $('#selectLeftMotorBtn').toggleClass("on",true);
        $('#motorLeftStatusTxt').toggleClass("on",true);
    });

    motorRight.on(motorRight.EVENT_TYPE.connect,(kMDeviceInfo)=>{
        console.log("onConnect:"+kMDeviceInfo.isConnect);
        $('#motorRightStatus').toggleClass("enable",true);
        $('#selectRightMotorBtn').toggleClass("on",true);
        $('#motorRightStatusTxt').toggleClass("on",true);
    });
    motorLeft.on(motorLeft.EVENT_TYPE.disconnect,(kMDeviceInfo)=>{
        console.log("disconnect:"+kMDeviceInfo.isConnect);
        $('#motorLeftStatus').toggleClass("enable",false);
        $('#selectLeftMotorBtn').toggleClass("on",false);
        $('#motorLeftStatusTxt').toggleClass("on",false);
    });
    motorRight.on(motorRight.EVENT_TYPE.disconnect,(kMDeviceInfo)=>{
        console.log("disconnect:"+kMDeviceInfo.isConnect);
        $('#motorRightStatus').toggleClass("enable",false);
        $('#selectRightMotorBtn').toggleClass("on",false);
        $('#motorRightStatusTxt').toggleClass("on",false);
    });
    motorLeft.on(motorLeft.EVENT_TYPE.connectFailure,(kMDeviceInfo,err)=>{
        console.log("motorLeft onConnectFailure:"+err);
        alert("motorLeft onConnectFailure:"+err);
    });
    motorRight.on(motorRight.EVENT_TYPE.connectFailure,(kMDeviceInfo,err)=>{
        console.log("motorRight onConnectFailure:"+err);
        alert("motorRight onConnectFailure:"+err);
    });

    motorLeft.on(motorLeft.EVENT_TYPE.motorMeasurement,(kMRotState)=>{
        $motorLeftStatusTxt.text(kMRotState.position);
        motorLeftBeforRotState=kMRotState;
    });
    motorRight.on(motorRight.EVENT_TYPE.motorMeasurement,(kMRotState)=>{
        motorRightBeforRotState=kMRotState;
        $motorRightStatusTxt.text(kMRotState.position);
    });

    motorLeft.on(motorLeft.EVENT_TYPE.init,function(kMDeviceInfo){
        console.log("onInit:"+kMDeviceInfo.name);
        motorLeft.cmdEnable();//For safety, the motor operation at startup is disabled
        motorLeft.cmdDisableIMU();//info::GyroGraphのデモでモーターのGyroがOnになっていた場合にOffにする(負荷軽減の為)
        motorLeft.cmdSpeed_rpm(0);
    });
    motorRight.on(motorLeft.EVENT_TYPE.init,function(kMDeviceInfo){
        console.log("onInit:"+kMDeviceInfo.name);
        motorRight.cmdEnable();//For safety, the motor operation at startup is disabled
        motorRight.cmdDisableIMU();//info::GyroGraphのデモでモーターのGyroがOnになっていた場合にOffにする(負荷軽減の為)
        motorRight.cmdSpeed_rpm(0);
    });

    //------------------------------
    // トラックパッドUI
    //------------------------------
    let option={
        device_name:null
        ,min_move_dist:30
        ,max_move_dist:150
        ,UIInput_watch_time:200
        ,UIInput_mode:UI_INPUT_MODE.CENTER_FIXED
        ,OnChangePoint:function(vector2,xy_vector2){
            //送信
            moveRunStack(vector2);
        }
    };
    inputctl_XYPad(option,$("#inputctl_XYPad_wrap").get(0));

    /**
     * トラックパッドから入力された移動ベクトルを定期的に送る MOVE_TYPE.RUN
     * @param kMVector2
     */
    let _moveStackIntervalID=0;
    function moveRunStack(kMVector2){
        clearTimeout(_moveStackIntervalID);
        if(!kMVector2.x&&!kMVector2.y){//0は停止
            moveVector(kMVector2,MOVE_TYPE.RUN);
        }else{
            moveVector(kMVector2,MOVE_TYPE.RUN);
            _moveStackIntervalID= setTimeout(()=>{
                console.log("setTimeout moveVector");
                moveRunStack(kMVector2);
            },option.UIInput_watch_time);
        }
    }

    //ウインドウリサイズのUI調整
    let timer = false;
    $(window).resize(function() {
        if (timer !== false) {
            clearTimeout(timer);
        }
        timer = setTimeout(function() {
            $("#inputctl_XYPad_wrap").empty();
            inputctl_XYPad(option,$("#inputctl_XYPad_wrap").get(0));
            console.log("risize");
        }, 200);
    });

    //------------------------------
    // その他UIバインド
    //------------------------------

    $('#motorLeftReversBtn').on('click',function(){
        motorLeftRevers= !motorLeftRevers;
        $(this).toggleClass("on",motorLeftRevers);
    });
    $('#motorRightReversBtn').on('click',function(){
        motorRightRevers= !motorRightRevers;
        $(this).toggleClass("on",motorRightRevers);
    });
    $('#maxSpeedBtn').on('input',function(){
        maxSpeed=parseInt( $(this).val(),10);
    });
    $('#changeIDBtn').on('click',function(){
        changeID();
    });

    $('#menuSetting').on('click',function(){
        $('#settingPanel').toggle();
        $('#pad').toggle($('#settingPanel').is(':visible'));
        $(this).toggleClass("on",$('#settingPanel').is(':visible'));
    });



    $("#selectLeftMotorBtn").on('click',function(){connectMotor('L');});
    $("#selectRightMotorBtn").on('click',function(){connectMotor('R');});
    $("#padXYSwapBtn").on('click',function(){
        padXYSwap= !padXYSwap;
        UTL_save_storage("padXYSwap",padXYSwap);
        $(this).toggleClass("on",padXYSwap);
    });

    $('#menuVideo').on('click',function(){
        $('.leftPanel').show();
        $('.rightPanel').hide();
        $(this).toggleClass("on",true);
        $('#menuSetting').toggleClass("on",false);
    });
    $('#menuSetting').on('click',function(){
        $('.rightPanel').show();
        $('.leftPanel').hide();
        $(this).toggleClass("on",true);
        $('#menuVideo').toggleClass("on",false);
    });

    //------------------------------
    // メソッド
    //------------------------------
    ///////////
    function connectMotor(pos){
        switch(pos){
            case "L":
                if(!motorLeft.isConnect){
                    motorLeft.connect();
                }else{
                    motorLeft.disConnect();
                }
                break;
            case "R":
                if(!motorRight.isConnect){
                    motorRight.connect();
                }else{
                    motorRight.disConnect();
                }
                break;
        }
    }

    function moveVector(kMVector2,moveType){
        if(!kMVector2 instanceof KMVector2){return;}
        if(padXYSwap){
            kMVector2= new KMVector2(kMVector2.y,kMVector2.x);
        }

        let movedistanceRange=180;//Math.PI*2;//moveVector MOVETYPE.POSITION 時の1回の移動距離

        let sθ=kMVector2.RadianFromZero();
        let sx=kMVector2.x;
        let sr=kMVector2.DistanceFromZero();

        //θ角から4現象の区分け
        let ans_x=0,ans_y=0;
        switch(true){
            case sθ <= -Math.PI*0.5://第3現象 (-2x-r,-r)
                ans_x= 2*sx*sx/(sr*distRatio) -sr;ans_y=-sr ;
                break;
            case sθ <= 0://第4現象 (-r,2x-r)
                ans_x= -sr;ans_y=2*sx*sx/(sr*distRatio) -sr ;
                break;
            case sθ <= Math.PI*0.5://第1現象 (r,-2x^2/r+r)
                ans_x= sr; ans_y= -2*sx*sx/(sr*distRatio) +sr;
                break;
            case sθ <= Math.PI://第2現象 (-2x^2/r+r,r)
                ans_x= -2*sx*sx/(sr*distRatio) +sr;ans_y= sr;
                break;
        }
        ans_x=Number.isFinite(ans_x)?ans_x:0;
        ans_y=Number.isFinite(ans_y)?ans_y:0;

        let lr=motorLeftRevers?ans_x*maxSpeed*-1:ans_x*maxSpeed;
        let rr=motorRightRevers?ans_y*maxSpeed*-1:ans_y*maxSpeed;
        //モーターへ送信
        motorLeft.cmdSpeed_rpm(Math.abs(lr));
        motorRight.cmdSpeed_rpm(Math.abs(rr));

        clearTimeout(moveStopIntervalID);
        switch (moveType){
            case MOVE_TYPE.RUN:

                if(lr<0){
                    motorLeft.cmdRunForward();
                }else{
                    motorLeft.cmdRunReverse();
                }
                if(rr<0){
                    motorRight.cmdRunForward();
                }else{
                    motorRight.cmdRunReverse();
                }
                //パケット遅延・切断を考慮して相対位置による、一定量の前進処理にする
                moveStopIntervalID=setTimeout(moveStop,300);
                break;

            case MOVE_TYPE.POSITION:
                //info::移動座標は積算される(コマンド実行回数×座標)
                let tl=1/(Math.abs(lr)+Math.abs(rr));
                let ml=lr*tl*movedistanceRange;
                let mr=rr*tl*movedistanceRange;
                //回転時の速度スケーリング 横は半分の速度
                let sc= Math.abs(ml+mr)>=360?0.5:1;


                //相対位置による、一定量の前進処理にする (指定座標移動)
                //info::cmdMoveByDistanceは座標移動中に、新たに受信した場合、全受信コマンドの積算座標になる
                // motorLeft.cmdMoveByDistance(KMUtl.degreeToRadian(ml*sc));
                // motorRight.cmdMoveByDistance(KMUtl.degreeToRadian(mr*sc));

                motorLeft.cmdMoveToPosition(motorLeftBeforRotState.position+KMUtl.degreeToRadian(ml*sc));//info::カク付く
                motorRight.cmdMoveToPosition(motorRightBeforRotState.position+KMUtl.degreeToRadian(mr*sc));


                //console.log(ml,mr,sc);
                break;
        }

    }




    function moveStop(){
        motorRight.cmdStop();
        motorLeft.cmdStop();
    }
    
    function changeID() {
        UTL_remove_storage("conID");
        alert("Reload browser!");
        location.reload();
    }


    window.moveVector=moveVector;//debug
});