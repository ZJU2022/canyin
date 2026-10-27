// Package httpapi 是门口。网页把请求送到这里，这里再叫规则去算。
package httpapi

import (
	"encoding/json"
	"log"
	"net/http"

	"canyin/internal/logic"
	"canyin/internal/model"
)

// API 带着页面目录。这家店的规则不需要数据库，算完就返回。
type API struct {
	WebDir string
}

func New(webDir string) *API {
	return &API{WebDir: webDir}
}

// Handler 登记地址。页面走 GET /，算账走 /api/calc。
func (a *API) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", a.health)
	mux.HandleFunc("GET /api/shop", a.shop)
	mux.HandleFunc("POST /api/calc", a.calc)
	mux.Handle("GET /", noStore(http.FileServer(http.Dir(a.WebDir))))
	return mux
}

func (a *API) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) shop(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, model.NewShop())
}

func (a *API) calc(w http.ResponseWriter, r *http.Request) {
	var in model.Input
	if !readJSON(w, r, &in) {
		return
	}
	if msg := logic.Validate(in); msg != "" {
		writeErr(w, http.StatusBadRequest, msg)
		return
	}
	writeJSON(w, http.StatusOK, logic.Calc(in))
}

func readJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeErr(w, http.StatusBadRequest, "请求内容看不懂，请检查填写的数字")
		return false
	}
	return true
}

func noStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, code int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("写出响应失败: %v", err)
	}
}

func writeErr(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}
