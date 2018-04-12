'use strict';
$(function() {
    const CONTROLLER_TYPE={'PAD':0,'SWIPE':1};
    let conID =UTL_load_storage("conID");

    $('#callto-id').val(conID);
    // Peer object
    const peer = new Peer({
        key:   window.__SKYWAY_KEY__,
        debug: 3,
    });

    let localStream;
    let existingCall;
    let dataConnection;

    peer.on('open', () => {
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

    $('#make-call').on('submit', e => {
        e.preventDefault();
        // Initiate a call!
        let conID=$('#callto-id').val();
        UTL_save_storage("conID",conID);
        const call = peer.call(conID, localStream);
        const dataCon = peer.connect(conID);
        step3(call,dataCon);
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
    }

    function step3(call,dataCon) {
        if (existingCall) {
            existingCall.close();
        }
        call.on('stream', stream => {
            const el = $('#their-video').get(0);
            el.srcObject = stream;
            el.play();
        });

        // UI stuff
        existingCall = call;
        dataConnection=dataCon;

        $('#their-id').text(call.remoteId);
        call.on('close', step2);
        $('#step1, #step2').hide();
        $('#step3').show();
        $('#menuSetting').trigger("click");
    }


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
            console.log(vector2.x,vector2.y);
        }
    };
    inputctl_XYPad(option,$("#inputctl_XYPad_wrap").get(0));
    /**
     * トラックパッドから入力された移動ベクトルを定期的に送る
     * @param kMVector2
     */
    let _moveStackIntervalID=0;
    function moveRunStack(kMVector2){
        clearTimeout(_moveStackIntervalID);
        if(!kMVector2.x&&!kMVector2.y){//0は停止
            sendVector(kMVector2,CONTROLLER_TYPE.PAD);
        }else{
            sendVector(kMVector2,CONTROLLER_TYPE.PAD);
            _moveStackIntervalID= setTimeout(()=>{
                console.log("setTimeout sendVector");
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
    // スワイプUI
    //------------------------------
    //swipePanel
    let manager = new Hammer.Manager($('#swipePanel')[0]);
    let ev = new Hammer.Swipe({direction: Hammer.DIRECTION_ALL,velocity:0.3, threshold: 10});
    manager.add(ev);
    let handlerFunction=function(){};
    manager.on('swipe', function(e) {

        //console.log(e.deltaX,e.deltaY,e.distance);
        let tl=1/(Math.abs(e.deltaX)+Math.abs(e.deltaY));
        let pos={x:e.deltaX*tl,y:e.deltaY*tl};
        sendVector(pos,CONTROLLER_TYPE.SWIPE);
    });



    //------------------------------
    // その他UIバインド
    //------------------------------

    $('#menuSetting').on('click',function(){
        $('#settingPanel').toggle();
        $(this).toggleClass("on",$('#settingPanel').is(':visible'));
    });

    $('#hideMyVideo').on('click',function(){
        let chk_status = $(this).prop("checked");
        //$(this).prop("checked", !chk_status);
        $("#my-video").toggle(!chk_status);
    });

    //------------------------------
    // メソッド
    //------------------------------
    ///////////
    function sendVector(kMVector2,moveType){
        if(dataConnection){
              dataConnection.send({controllerType:moveType,x:kMVector2.x,y:kMVector2.y});
        }

    }

    window.sendVector=sendVector;//debug
});