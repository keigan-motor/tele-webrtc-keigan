# tele-webrtc-keigan
KeiganMotor、WebRTC、Web Bluetooth APIを使用した、テレプレゼンスロボットのサンプルです。  
Keigan Motor 2個を使用したKeigan Motor (KM-1) ロボットスターターキットに最適です。  
chromeブラウザー上で動作します。

## インストール  
* Web Bluetooth APIを使用している為、httpsで接続出来るWebServerに設置して下さい。  
* Web Bluetooth APIの使用出来るAndroid版chrome又はMac版chromeで動作します。  
* WebRTCの接続にはSkyWayを使用しています。  
SkyWayでアカウントを作成し[https://webrtc.ecl.ntt.com/]  
tele_central.html及びtele_peripheral.htmlの`window.__SKYWAY_KEY__ `の部分を自身のAPIキーに書き換えて下さい。
* KeiganMotorの操作には[KeiganMotor用JavascriptApi](https://github.com/keigan-motor/kmconnector-js)を使用しています。  

## デモ  
https://document.keigan-motor.com/javascript-api/telesample.html

