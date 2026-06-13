## なにこれ

Cloudflare Workersを使って、RSSフィードをチェックして新着があったらBlueskyにポストするBotです。
noteなどに自分の記事を投稿したらBlueskyに自動投稿を行う用途を想定しています。

## 構造

- bsky-feedchecker
    - フィードリーダー本体
    - このフォルダの中身をWorkersにデプロイする

## 大まかな処理の流れ

1. RSSフィードをチェック
2. D1 Databaseの投稿済み記事と比較
   - 新着があればD1 Databaseに登録
   - 新着がなければ何もしない
3. 新着があれば対象アカウントでポスト

