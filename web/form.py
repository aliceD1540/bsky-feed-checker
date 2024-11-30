import os

from atproto import Client, IdResolver, models
from dotenv import load_dotenv
from flask import Flask, render_template, request

app = Flask(__name__)

load_dotenv(".env")

SYSTEM_USER = os.getenv("BSKY_USER_NAME")
SYSTEM_PASS = os.getenv("BSKY_APP_PASS")


@app.route("/")
def index():
    return render_template("index.html", system_user=SYSTEM_USER)


@app.route("/submit", methods=["POST"])
def submit():
    account = request.form["account"]
    app_pass = request.form["app_pass"]

    try:
        # システム側セッション
        client_system = Client()
        client_system.login(login=SYSTEM_USER, password=SYSTEM_PASS)
        # 登録者側セッション
        client_user = Client()
        client_user.login(login=account, password=app_pass)

        id_resolver = IdResolver()
        dm_client = client_system.with_bsky_chat_proxy()
        dm = dm_client.chat.bsky.convo
        chat_to = id_resolver.handle.resolve(account)
        print(chat_to)
        convo = dm.get_convo_for_members(
            models.ChatBskyConvoGetConvoForMembers.Params(members=[chat_to]),
        ).convo
        print(f"\nConvo ID: {convo.id}")
        dm.send_message(
            models.ChatBskyConvoSendMessage.Data(
                convo_id=convo.id,
                message=models.ChatBskyConvoDefs.MessageInput(
                    text=app_pass,
                ),
            )
        )
        return f"Bluesky account: {account}, App Password: {app_pass}"
    except:
        # 登録失敗
        message = "登録に失敗しました。アカウント名やアプリパスワードが誤っていないか確認してください。"
        return render_template("index.html", system_user=SYSTEM_USER, message=message)


if __name__ == "__main__":
    app.run(debug=True)
