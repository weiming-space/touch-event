zepto event.js触模事件分析:

兼容了touch事件和指针事件和MS专有ie指针事件

主要有两类事件：

1、swipe及相关滑动事件

swipe, swipeLeft, swipeRight, swipeUp, swipeDown

2、tap及想着点击事件

tap, doubleTap, singleTap, longTap, 


基本原理：

对相应的事件做了统称处理为{down, move, up, cancel}；分别绑定了document对象上，主要实现在down、move、up三个方法上，最重点的up方法上。

根据x、y方向上移动的距离，

只要某一方向上大于30是触发滑动事件，执行相应的swipe和swipe上下左右上的某个事件。

移动距离小于30就触发相应的tap点击事件（
	
	首先，tap事件最先被触发。
	然后，检测是否是双击事件行为，如果是就触发，触发完就结束，如果不是，往下判断。
	最后，如果不再活动的情况下，250m后触发singleTap事件
）


长按不放750m后触发longTap长按事件；

doubleTap判断的时机是，两次点击的间隔大于0且小于250ms,就认定为双事件。是同last属性来做标识的。

只要不是滑动事件，tap就总会触发，没有后续操作250ms后触发singTap；连续再次点击就会先触发tap, 再触发doubleTap；不再触发singTap;





