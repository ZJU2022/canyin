// Package model 存放这家店的“形状”。
// 可以把它想成表头：页面上有哪些块、算账时要填哪些数、算完交回哪些数。
// 这里不做判断。判断在 logic。网页只把这些字段画出来。
package model

// Input 是试算一天时填进来的数。网页改一个空，就把整份 Input 送过来。
type Input struct {
	Price       float64 `json:"price"`        // 客单价，客人一单付多少
	OfflineKeep float64 `json:"offline_keep"` // 堂食一碗扣掉食材后留下的毛利
	OnlineKeep  float64 `json:"online_keep"`  // 外卖不参加活动时一碗的毛利
	PromoKeep   float64 `json:"promo_keep"`   // 外卖参加活动时一碗的毛利，亏就是负数
	OfflinePct  float64 `json:"offline_pct"`  // 堂食占总碗数的百分比
	PromoPct    float64 `json:"promo_pct"`    // 外卖里面，参加活动的百分比
	RentMonth   float64 `json:"rent_month"`   // 月租
	DailyExtra  float64 `json:"daily_extra"`  // 一天的水电、燃气、耗材
	DailyWage   float64 `json:"daily_wage"`   // 一天人工。0 表示暂不领工资
	Orders      int     `json:"orders"`       // 假设这一天卖出多少碗
}

// Channel 是一种入口在这一天的合计。
type Channel struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Orders int     `json:"orders"`
	Keep   float64 `json:"keep"`
	Gross  float64 `json:"gross"`
}

// Result 是规则算完交给页面的结论。页面照着画，不再自己重算一遍。
type Result struct {
	Food            float64   `json:"food"`
	FoodRate        float64   `json:"food_rate"`
	Blended         float64   `json:"blended"`
	Fixed           float64   `json:"fixed"`
	DailyRent       float64   `json:"daily_rent"`
	BreakEven       int       `json:"break_even"`
	CannotBreakEven bool      `json:"cannot_break_even"`
	DayGross        float64   `json:"day_gross"`
	DayProfit       float64   `json:"day_profit"`
	MonthProfit     float64   `json:"month_profit"`
	Covered         bool      `json:"covered"`
	Channels        []Channel `json:"channels"`
	Formula         string    `json:"formula"`
	Message         string    `json:"message"`
	Notes           []string  `json:"notes"`
}

// Part 是店的图上可以点的一块。Name 画在图里，Lesson 点开后显示。
type Part struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Lesson string `json:"lesson"`
}

// Person 是这家店里的人，以及他负责图上的哪一块。
type Person struct {
	Name string `json:"name"`
	Role string `json:"role"`
}

// Question 是开店前要答清的一个问题。
type Question struct {
	Ask  string `json:"ask"`
	Need string `json:"need"`
	Miss string `json:"miss"`
}

// Customer 是一种客人。选了一种，位置和价格跟着走。
type Customer struct {
	Who   string `json:"who"`
	Care  string `json:"care"`
	Place string `json:"place"`
	Price string `json:"price"`
}

// Gate 是租门面之前要过的一道门。
type Gate struct {
	Name string `json:"name"`
	Pass string `json:"pass"`
}

// Pit 是容易掉进去的一种做法。
type Pit struct {
	Name  string `json:"name"`
	Look  string `json:"look"`
	Avoid string `json:"avoid"`
}

// Shop 是打开页面时一次拿齐的教学内容。
type Shop struct {
	Title     string     `json:"title"`
	Intro     string     `json:"intro"`
	People    []Person   `json:"people"`
	Parts     []Part     `json:"parts"`
	Questions []Question `json:"questions"`
	Customers []Customer `json:"customers"`
	Gates     []Gate     `json:"gates"`
	Pits      []Pit      `json:"pits"`
	RentStory string     `json:"rent_story"`
	Defaults  Input      `json:"defaults"`
}
