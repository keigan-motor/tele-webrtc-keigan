
function UTL_save_storage(key,obj){
    let storage_json_str="";
    try{
        storage_json_str = JSON.stringify(obj);
    }catch(e){
        storage_json_str="";
    }
    if(!localStorage){
        return;
    }else{
        localStorage.setItem("km_"+key,storage_json_str);
        return true;
    }
}


/**
 * 永続的データの取得
 * @param key
 * @returns {*}
 * @constructor
 */
function UTL_load_storage(key){
    let storage_json_str="";
    if(!localStorage){
        return;
    }else{
        storage_json_str=localStorage.getItem("km_"+key);
    }
    let obj=null;
    try{
        obj=JSON.parse(storage_json_str);
    }catch(e){
        //alert(e);
    }
    return obj;
}

/**
 * 永続データの指定削除
 * @param key
 * @returns {boolean}
 * @constructor
 */
function UTL_remove_storage(key){
    if(!localStorage){
        return;
    }else{
        localStorage.removeItem("km_"+key);
        return true;
    }
}