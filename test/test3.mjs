arr = []

for i of 1..10
	arr.push({
		a = i
		b = i * 3
	})
;

for a,b in arr
	print 'a: %a\tb: %b'
;