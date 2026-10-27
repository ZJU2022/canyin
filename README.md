# 一家店

用一家快餐店看餐饮：定位、堂食、外卖、保本碗数。打开网页就能点图、改数字。

算法在 `internal/logic`，页面在 `web`。页面负责画，规则负责算。

## 打开

需要已安装 Go。

```bash
go run ./cmd/server
```

浏览器打开 http://localhost:8081

## 在 CentOS 云主机上部署

需要 root。第一次：

```bash
git clone <你的仓库地址>
cd canyin
sudo bash deploy.sh
```

以后更新代码：

```bash
git pull
sudo bash deploy.sh
```

脚本会安装编译用的 Go、编译程序、设置开机自启，并在本机防火墙放行 8081。

云主机的安全组也要放行 TCP 8081。完成后用 `http://公网IP:8081` 打开。

查看是否在跑：`systemctl status canyin`

三页：

- 店的样子：点平面图上的每一块
- 一碗和一天：改月租和渠道，看钱柜有没有被填满
- 租之前：三个问题、客群、租房前的三道门
