// 这是程序的入口：打开网页目录，然后等浏览器来访问。
// 在项目根目录运行：go run ./cmd/server
// 然后打开 http://localhost:8081
//
// 和 qiutu 一样分成三层：
//
//	web            只负责画，给人看、给人点
//	internal/httpapi  门口，把浏览器的请求交给规则
//	internal/logic    规则，算保本碗数，不碰网页
package main

import (
	"flag"
	"log"
	"net/http"
	"strings"
	"time"

	"canyin/internal/httpapi"
)

func main() {
	addr := flag.String("addr", ":8081", "监听地址")
	webDir := flag.String("web", "web", "页面目录")
	flag.Parse()

	server := &http.Server{
		Addr:              *addr,
		Handler:           httpapi.New(*webDir).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}
	shown := *addr
	if strings.HasPrefix(shown, ":") {
		shown = "localhost" + shown
	}
	log.Printf("一家店的餐饮模型已启动，用浏览器打开 http://%s", shown)
	log.Fatal(server.ListenAndServe())
}
