/**
 * MeguRee 取引先の並べ替えヘルパー（共通）
 *
 * 取引先のプルダウン・一覧を「あいうえお順」に並べるための共通処理。
 *
 * なぜ必要か：
 *   会社名は漢字が混ざるため、そのまま並べても読みの順にはならない
 *   （「北海道…」が「ほ」の位置に来ない）。また「株式会社」が頭に付く取引先が
 *   まとまって「か」の位置に固まってしまう。
 *   そこで並べ替えには次の優先順で作った「並べ替え用のよみ」を使う。
 *     1) 取引先マスタの「よみ（カナ）」欄（customers.name_kana・migration 062）
 *     2) 未入力なら、会社名から法人格（株式会社・有限会社・（株）など）を外した文字列
 *
 * 使い方：
 *   MeguReeCustomerSort.key(companyName, nameKana)  -> 並べ替え用の文字列
 *   MeguReeCustomerSort.compare(aName, aKana, bName, bKana) -> -1 / 0 / 1
 *   MeguReeCustomerSort.sort(list, getName, getKana) -> 新しい配列（元の配列は壊さない）
 *   MeguReeCustomerSort.strip(companyName)          -> 法人格だけ外した文字列（表示には使わない）
 *
 * 比較は localeCompare(..., 'ja') を使う。よみが入っていれば完全なあいうえお順、
 * 未入力の漢字名は読みが分からないため、よみ入りの取引先のあとに並ぶ。
 */
(function(global) {
  'use strict';

  // 会社名の頭・末尾から外す法人格。長いものから順に試す（「一般社団法人」が「社団法人」より先）。
  var CORP_FORMS = [
    '特定非営利活動法人', '一般社団法人', '一般財団法人', '公益社団法人', '公益財団法人',
    '社会福祉法人', '医療法人社団', '医療法人財団', '医療法人', '学校法人', '宗教法人',
    '農業協同組合連合会', '漁業協同組合連合会', '生活協同組合連合会',
    '農業協同組合', '漁業協同組合', '生活協同組合', '事業協同組合', '協同組合',
    '企業組合', '相互会社', '株式会社', '有限会社', '合同会社', '合名会社', '合資会社'
  ];

  // 法人格の略記。全角・半角・合字のどれで書かれていても外す。
  var CORP_ABBR = [
    '（株）', '(株)', '㈱', '（有）', '(有)', '㈲',
    '（合）', '(合)', '（同）', '(同)', '㈾', '㈴', '（財）', '(財)', '（社）', '(社)'
  ];

  /** 文字列の先頭・末尾から法人格を外す。中間の法人格は会社名の一部なので触らない。 */
  function strip(name) {
    var s = String(name == null ? '' : name).trim();
    var changed = true;
    // 「（株）山田商店株式会社」のように両端に付く場合もあるので、外せなくなるまで繰り返す
    while (changed) {
      changed = false;
      var forms = CORP_ABBR.concat(CORP_FORMS);
      for (var i = 0; i < forms.length; i++) {
        var f = forms[i];
        if (s.length > f.length && s.indexOf(f) === 0) {
          s = s.slice(f.length).trim(); changed = true; break;
        }
        if (s.length > f.length && s.lastIndexOf(f) === s.length - f.length) {
          s = s.slice(0, s.length - f.length).trim(); changed = true; break;
        }
      }
    }
    return s || String(name == null ? '' : name).trim();
  }

  // 長音「ー」を置き換えるための母音表。
  // 辞書の並べ方のきまり（JIS X 4061）では、長音は直前の文字の母音として読む。
  // 例「ニッコー」→「にっこお」。これをやらないと「にっこ」になり、に の中での並びがずれる。
  var VOWEL_OF = {};
  (function() {
    var rows = {
      'あ': 'あかさたなはまやらわがざだばぱゃゎぁ',
      'い': 'いきしちにひみりゐぎじぢびぴぃ',
      'う': 'うくすつぬふむゆるぐずづぶぷゅぅゔ',
      'え': 'えけせてねへめれゑげぜでべぺぇ',
      'お': 'おこそとのほもよろをごぞどぼぽょぉ'
    };
    Object.keys(rows).forEach(function(v) {
      rows[v].split('').forEach(function(c) { VOWEL_OF[c] = v; });
    });
  })();

  /**
   * 比較用に文字を揃える。
   * ・全角英数→半角、半角カナ→全角カナ（NFKC）
   * ・カタカナ→ひらがな（「ホテル」と「ほてる」を同じ扱いにする）
   * ・長音「ー」→直前の文字の母音（辞書のきまり。「ニッコー」→「にっこお」）
   * ・空白・記号・括弧は無視（「山田 商店」と「山田商店」を同じ扱いにする）
   */
  function norm(s) {
    var t = String(s == null ? '' : s);
    if (typeof t.normalize === 'function') {
      try { t = t.normalize('NFKC'); } catch (e) {}
    }
    // カタカナ（ァ〜ヶ）をひらがなへ。ヴ(30F4)・ヵ(30F5)・ヶ(30F6) も含めて 0x60 引く
    t = t.replace(/[ァ-ヶ]/g, function(c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
    // 長音記号を直前のかなの母音へ。かな以外の直後（英字や記号の後）はただの記号として後で落ちる
    t = t.replace(/ー+/g, function(run, idx) {
      var prev = t.charAt(idx - 1);
      var v = VOWEL_OF[prev];
      return v ? new Array(run.length + 1).join(v) : run;
    });
    t = t.toLowerCase();
    // 空白・中黒・各種括弧・記号を落とす
    t = t.replace(/[\s　・,，.．'’"”\-－‐―ー_/／\\（）()「」『』【】\[\]{}&＆+＋!！?？:：;；*＊#＃@＠~～]/g, '');
    return t;
  }

  /** 並べ替えに使う文字列。よみ欄があればそれ、無ければ法人格を外した会社名。 */
  function key(companyName, nameKana) {
    var kana = String(nameKana == null ? '' : nameKana).trim();
    return norm(kana || strip(companyName));
  }

  /** 2件を比較する。よみ・会社名が同じ並びになる時は会社名そのもので決める（並びが毎回同じになるように）。 */
  function compare(aName, aKana, bName, bKana) {
    var ka = key(aName, aKana);
    var kb = key(bName, bKana);
    var c = ka.localeCompare(kb, 'ja');
    if (c !== 0) return c;
    return String(aName == null ? '' : aName).localeCompare(String(bName == null ? '' : bName), 'ja');
  }

  /**
   * 配列をあいうえお順に並べた新しい配列を返す（元の配列は変えない）。
   * @param {Array} list
   * @param {Function} getName 要素から会社名を取り出す関数
   * @param {Function} [getKana] 要素からよみを取り出す関数（省略可）
   */
  function sort(list, getName, getKana) {
    var gn = typeof getName === 'function' ? getName : function(x) { return x; };
    var gk = typeof getKana === 'function' ? getKana : function() { return ''; };
    return (list || []).slice().sort(function(a, b) {
      return compare(gn(a), gk(a), gn(b), gk(b));
    });
  }

  global.MeguReeCustomerSort = {
    strip: strip,
    norm: norm,
    key: key,
    compare: compare,
    sort: sort
  };
})(window);
