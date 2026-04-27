// 动态加载帖子数据
async function loadPostData(postId) {
    try {
        const response = await fetch(`data/post_${postId}.json`);
        if (!response.ok) {
            throw new Error(`帖子数据文件不存在: post_${postId}.json`);
        }
        return await response.json();
    } catch (error) {
        console.warn('加载帖子数据失败，使用备用数据:', error);
        return getFallbackPostData(postId);
    }
}

// 备用帖子数据（fallback）
function getFallbackPostData(postId) {
    const fallbackData = {
        "1": {
            "id": 1,
            "title": "【城市论坛】说说你在的城市，一个月工资能买几平米？房价到底怎么涨？",
            "author": "☆_房产の观察家_☆",
            "authorLevel": "Lv.3 中级会员",
            "authorAvatar": "images/用户头像.png",
            "publishTime": "2010-04-17 10:30:45",
            "viewCount": 2345,
            "content": "<p>房价一直是大家关注的热点话题，尤其是在一线城市，房价的涨幅让很多年轻人望而却步。今天我们来讨论一下，在你所在的城市，一个月的工资能买几平米房子？</p><h3>一线城市情况</h3><p>在北京、上海、深圳等一线城市，房价普遍在每平米1-3万元之间（2010年数据），而平均工资大约在3000-6000元左右。这意味着，一个月的工资只能买0.2-0.4平米的房子，想要买一套100平米的房子，不吃不喝也得几十年。</p><h3>二线城市情况</h3><p>在杭州、南京、成都等二线城市，房价大约在每平米8000-15000元之间，平均工资在2000-4000元左右。一个月的工资能买0.25-0.5平米的房子，压力同样不小。</p><h3>网友讨论</h3><p>@神马都是浮云：在深圳工作3年，月薪4000，依然买不起房，只能租房住，也是醉了。</p><p>@给跪了：在南京有套房，现在房价翻了一倍，感觉自己要发财了，不解释。</p><p>@杯具的小明：刚毕业工资2000，房价1万，你造吗？我勒个去！</p><p>你所在的城市房价如何？一个月工资能买几平米？欢迎在评论区分享你的情况！</p>",
            "comments": [
                {"id": 1, "author": "ゞ泪流满面的小明ζ", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-18 09:15:32", "floor": 2, "content": "<p>前排占座！坐标上海，月薪3500，房价2万/平，一个月工资能买0.175平，想想就泪流满面... T_T</p><p>工作3年了，连首付的零头都没攒够，神马都是浮云啊！</p>"},
                {"id": 2, "author": "oοゞ杭州新市民ゞοo", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-18 10:42:18", "floor": 3, "content": "<p>沙发！杭州城西，月薪3000，房价1.2万/平，一个月能买0.25平，努力几年还是有希望的！</p><p>打算再攒两年钱，加上家里支持一点，争取明年上车. 给跪了！</p>"},
                {"id": 3, "author": "成都安逸哥(￣▽￣)", "authorLevel": "Lv.4 高级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-19 14:28:55", "floor": 4, "content": "<p>板凳。成都二环路，月薪2500，房价6000/平，一个月能买0.4平，感觉压力还好。</p><p>成都生活节奏慢，房价相对友好，适合宜居。赞一个，不解释！</p>"},
                {"id": 4, "author": "ξ北京追梦人ξ", "authorLevel": "Lv.1 新手上路", "authorAvatar": "images/用户头像.png", "time": "2010-04-19 16:55:03", "floor": 5, "content": "<p>地板。北京五环外，月薪4000，房价1.5万/平，一个月0.26平，但是首付太难了... 也是醉了。</p><p>家里条件一般，全靠自己，不知道什么时候才能凑够首付. 我勒个去！</p>"},
                {"id": 5, "author": "广州打工人_bule", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-20 09:30:17", "floor": 6, "content": "<p>地下室。广州天河，月薪3500，房价1.2万/平，一个月0.29平，慢慢来吧。</p><p>相比北上深，广州的房价还是比较友好的，咬咬牙还是有希望的. 给力！</p>"},
                {"id": 6, "author": "火钳留名の武汉新青年", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-20 11:22:44", "floor": 7, "content": "<p>路过打酱油。武汉光谷，月薪2000，房价5000/平，一个月0.4平，感觉还可以接受。</p><p>新一线里武汉性价比挺高的，发展也快，看好未来. 火钳留名！</p>"},
                {"id": 7, "author": "↘深圳奋斗者↖", "authorLevel": "Lv.3 中级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-21 15:48:30", "floor": 8, "content": "<p>围观。深圳南山，月薪5000，房价2.5万/平，一个月0.2平，太难了太难了. 你造吗？</p><p>准备回老家发展了，深圳实在是买不起，压力太大了. 鸭梨山大啊！</p>"},
                {"id": 8, "author": "苏州小白领(^_−)☆", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-21 17:15:08", "floor": 9, "content": "<p>潜水多年冒个泡。苏州园区，月薪3000，房价8000/平，一个月0.375平，加油攒钱中。</p><p>苏州环境好，离上海近，感觉是个不错的选择. 妥妥的！</p>"},
                {"id": 9, "author": "✿重庆土著✿", "authorLevel": "Lv.3 中级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-22 10:30:00", "floor": 10, "content": "<p>重庆江北，月薪2200，房价4000/平，一个月0.55平！简直太幸福了！</p><p>重庆房价真的很良心，生活压力小很多，推荐大家来重庆发展. 各种羡慕嫉妒恨！</p>"},
                {"id": 10, "author": "西安奋斗哥+1", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-22 14:20:15", "floor": 11, "content": "<p>西安高新区，月薪2800，房价5500/平，一个月0.5平，还可以接受。</p><p>西安发展很快，文化底蕴深厚，适合定居. 楼上+1！</p>"},
                {"id": 11, "author": "坑爹の厦门岛民", "authorLevel": "Lv.4 高级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-23 09:45:30", "floor": 12, "content": "<p>厦门岛内，月薪3500，房价1.5万/平，一个月0.23平，压力山大...</p><p>不过厦门环境真的好，面朝大海春暖花开，咬咬牙坚持吧. 坑爹啊！</p>"},
                {"id": 12, "author": "郑州上班族(元芳你怎么看)", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-23 16:00:00", "floor": 13, "content": "<p>郑州东区，月薪2000，房价5000/平，一个月0.4平，感觉还行。</p><p>郑州作为中原核心，发展潜力大，房价相对友好. 元芳，你怎么看？</p>"},
                {"id": 13, "author": "楼中楼测试员", "authorLevel": "Lv.1 新手上路", "authorAvatar": "images/用户头像.png", "time": "2010-04-24 10:00:00", "floor": 14, "content": "<p>你说得对，上海的房价确实让人望尘莫及. 我也是醉了。</p>", "replyTo": 2},
                {"id": 14, "author": "深度评论家", "authorLevel": "Lv.5 社区元老", "authorAvatar": "images/用户头像.png", "time": "2010-04-24 11:30:00", "floor": 15, "content": "<p>我也觉得上海的生活成本太高了，其实二线城市也不错. 给力不解释！</p>", "replyTo": 14},
                {"id": 15, "author": "终极回复者", "authorLevel": "Lv.2 初级会员", "authorAvatar": "images/用户头像.png", "time": "2010-04-24 12:45:00", "floor": 16, "content": "<p>赞同楼上的深度分析！现在的年轻人确实需要更多的选择. 火钳留名！</p>", "replyTo": 15}
            ]
        }
    };
    return fallbackData[postId] || null;
}
