/*
 * zepto event.js 分析注解
 * @author: weiming
 */

;(function($){


    var touch = {},

        //相应定时器句柄
        touchTimeout,
        tapTimeout,
        swipeTimeout,
        longTapTimeout,

        longTapDelay = 750, //长按的延迟是750毫秒

        gesture,

        down,
        up,
        move,

        eventMap,
        initialized = false

    //判断滑动的方向；
    //第一步：先判断是x方向还是y方向
    //第二步：x方向时，判断是左还是右；y方向时，判断是上还是下
    //第三步；返回结果方向字符串
    function swipeDirection(x1, x2, y1, y2) {
        return Math.abs(x1 - x2) >=
            Math.abs(y1 - y2) ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
    }

    //长按事件处理器
    function longTap() {
        longTapTimeout = null
        if (touch.last) {
            touch.el.trigger('longTap')
            touch = {}
        }
    }

    //清除长按定时器
    function cancelLongTap() {
        if (longTapTimeout) clearTimeout(longTapTimeout)
        longTapTimeout = null
    }

    //清空定时器及事件绑定
    function cancelAll() {
        if (touchTimeout) clearTimeout(touchTimeout)
        if (tapTimeout) clearTimeout(tapTimeout)
        if (swipeTimeout) clearTimeout(swipeTimeout)
        if (longTapTimeout) clearTimeout(longTapTimeout)
        touchTimeout = tapTimeout = swipeTimeout = longTapTimeout = null
        touch = {}
    }

    //检测是否为主触点，必须是手指才可以
    //MSPOINTER_TYPE_TOUCH手指；MSPOINTER_TYPE_PEN手写笔；MSPOINTER_TYPE_MOUSE鼠标
    //pointerType:一个整数，标识了该事件来自鼠标、手写笔还是手指
    function isPrimaryTouch(event){
        return (event.pointerType == 'touch' ||
            event.pointerType == event.MSPOINTER_TYPE_TOUCH)
            && event.isPrimary
    }

    //检测是否指针事件
    function isPointerEventType(e, type){
        return (e.type == 'pointer'+type ||
            e.type.toLowerCase() == 'mspointer'+type)
    }

    //清除注册事件
    function unregisterTouchEvents(){
        if (!initialized) return
        $(document).off(eventMap.down, down)
            .off(eventMap.up, up)
            .off(eventMap.move, move)
            .off(eventMap.cancel, cancelAll)
        $(window).off('scroll', cancelAll)
        cancelAll()
        initialized = false
    }

    function setup(__eventMap){
        var now,
            delta,

            deltaX = 0,
            deltaY = 0,

            firstTouch,
            _isPointerType;

            //清除document、window对象上相应的事件，及相应的定时器
            unregisterTouchEvents()

        /*
        初始化eventMap对象；
        第一步：当__eventMap为真并且有down属性时，返回__eventMap; 否则，执行第二步
        第二步，判断是否有touch事件；有则返回一个属性指向相应的touch事件的对象{down, up, move, cancel}；；否则，执行第三步
        第三步，判断是否支持标准的指针事件; 有则返回一个属性指向相应的指针事件的对象{down, up, move, cancel}；否则，执行第四步
        第四步，判断是否支持ie指针事件，有则返回一个属性指向相应ie针对事件的对象{down, up, move, cancel}； 否则返回false
        */
        eventMap = (__eventMap && ('down' in __eventMap)) ? __eventMap :
          ('ontouchstart' in document ?
          { 'down': 'touchstart', 'up': 'touchend',
            'move': 'touchmove', 'cancel': 'touchcancel' } :
          'onpointerdown' in document ?
          { 'down': 'pointerdown', 'up': 'pointerup',
            'move': 'pointermove', 'cancel': 'pointercancel' } :
           'onmspointerdown' in document ?
          { 'down': 'MSPointerDown', 'up': 'MSPointerUp',
            'move': 'MSPointerMove', 'cancel': 'MSPointerCancel' } : false)

        //eventMap为false时，表示相应touch事件都不支持，则直接退出
        if (!eventMap) return

        //判断是否支持IE的专有事件MSGesture；有则执行下面的。对移动端ie基本上可以放弃。
        if ('MSGesture' in window) {
              gesture = new MSGesture()
              gesture.target = document.body

              $(document)
                .bind('MSGestureEnd', function(e){
                  var swipeDirectionFromVelocity =
                    e.velocityX > 1 ? 'Right' : e.velocityX < -1 ? 'Left' : e.velocityY > 1 ? 'Down' : e.velocityY < -1 ? 'Up' : null
                  if (swipeDirectionFromVelocity) {
                    touch.el.trigger('swipe')
                    touch.el.trigger('swipe'+ swipeDirectionFromVelocity)
                  }
                })
        }

        //注册down方法
        down = function(e){

            //判断，如果不是真正的touch事件，则直接返回
            if( (_isPointerType = isPointerEventType(e, 'down')) && !isPrimaryTouch(e) ){
                return
            }

            //如果是指针事件，返回e事件对象，否则返回touches第一个触点对象
            firstTouch = _isPointerType ? e : e.touches[0]

            //如果touchcancel没有默认触发的，则执行清除x2、y2的值
            if (e.touches && e.touches.length === 1 && touch.x2) {
            // Clear out touch movement data if we have it sticking around
            // This can occur if touchcancel doesn't fire due to preventDefault, etc.
                touch.x2 = undefined
                touch.y2 = undefined
            }

            //新建一个时间辍
            now = Date.now()

            delta = now - (touch.last || now)

            //获取taget目标元素；没有tagNam属性，则返回其你节点
            touch.el = $('tagName' in firstTouch.target ?
            firstTouch.target : firstTouch.target.parentNode)

            //清除singleTap的touch定时器
            touchTimeout && clearTimeout(touchTimeout)

            //存储按下时触点的x、y坐标; pageX、pageY是相对浏览器窗口的
            touch.x1 = firstTouch.pageX
            touch.y1 = firstTouch.pageY

            //时间段小于等于250毫秒时
            if (delta > 0 && delta <= 250) touch.isDoubleTap = true

            //更新last时间为now
            touch.last = now

            //开启一个长按定时器； 长按的默认延迟是750毫秒
            longTapTimeout = setTimeout(longTap, longTapDelay)


            // adds the current touch contact for IE gesture recognition
            if (gesture && _isPointerType) gesture.addPointer(e.pointerId)
        }

        //注册move方法
        move = function(e){
            if( (_isPointerType = isPointerEventType(e, 'move')) && !isPrimaryTouch(e) ) return

            //同down方法中的，兼容指针和touch事件
            firstTouch = _isPointerType ? e : e.touches[0]

            //清除长按定时器
            cancelLongTap()

            //存储移动时时事件触点的x、y坐标
            touch.x2 = firstTouch.pageX
            touch.y2 = firstTouch.pageY

            //计算按下和移动时之间的两点间距离
            deltaX += Math.abs(touch.x1 - touch.x2)
            deltaY += Math.abs(touch.y1 - touch.y2)
        }

        //注册up方法
        up = function(e){

            if((_isPointerType = isPointerEventType(e, 'up')) &&!isPrimaryTouch(e)) return

            //清除长按定时器
            cancelLongTap()

            //判断有没有移动过且抬起时移动的x、y轴分别的距离是否大于阈值30；只要有一个方向满足即可
            // swipe
            if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
              (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30))

            //开启滑动定时器
            swipeTimeout = setTimeout(function() {
              if (touch.el){
                touch.el.trigger('swipe')
                touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
              }
              touch = {}
            }, 0)

            // normal tap
            //第一次down按下的时候会有一个last属性，up抬起时如果触发了swipe事件，则被清除了。否则
            //开启tap定时器
            else if ('last' in touch)

                //有deltaX、deltaY表示移动了，移动距离小于阈值30时, 执行点击事件
                if (deltaX < 30 && deltaY < 30) {

                  tapTimeout = setTimeout(function() {

                    //调用tap事件
                    var event = $.Event('tap')
                    event.cancelTouch = cancelAll
                    if (touch.el) touch.el.trigger(event)

                    //触发双击事件
                    if (touch.isDoubleTap) {
                      if (touch.el) touch.el.trigger('doubleTap')
                      touch = {}
                    }

                    //不进行其它操作的情况下，250ms后触发单按
                    else {
                      touchTimeout = setTimeout(function(){
                        touchTimeout = null
                        if (touch.el) touch.el.trigger('singleTap')
                        touch = {}
                      }, 250)
                    }
                  }, 0)
                } else { //等于30时走此逻辑

                    touch = {}
                }

            //恢复为0
            deltaX = deltaY = 0
        }

        //给doucmen的touch事件绑定注册的对应up、down、move方法
        $(document).on(eventMap.up, up)
            .on(eventMap.down, down)
            .on(eventMap.move, move)

        //给doucment绑定cancelAll；回收事件。
        $(document).on(eventMap.cancel, cancelAll)

        //当用户滚动窗口时，说明用户的意图只是想滚动页面；也应该取消相应的tap和滑动事件；
        $(window).on('scroll', cancelAll)

        initialized = true
    }


    /*
     * 1、滑动事件： swipe 滑动； swipeLeft 向左滑； swipeRight 向右滑； swipeUp 向上滑； swipeDown 向下滑
     * 2、点击事件： tap 单击； doubleTap 双击； singleTap 按下； longTap 长按
     */
    ;[
        'swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown',
        'doubleTap', 'tap', 'singleTap', 'longTap'
    ].forEach(function(eventName){
        $.fn[eventName] = function(callback){
            return this.on(eventName, callback)
        }
    })

    $.touch = { setup: setup }

    $(document).ready(setup)

})(Zepto)
