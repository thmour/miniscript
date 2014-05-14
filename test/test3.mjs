obj = { a=1 b=2 c=3 }
            db = [{ user='peter' age=21 }, { user='john' age=32 }, { user='ralph' age=27 }]
            for i of 1..5
	            print i
            ;
            for i in obj
	            print i + ':', obj:i
            ;
            String::capitalize = # {
                return this:0.toUpperCase() + this.slice(1)
            }
            for user, age in db
                print "%user.capitalize() is %{age + 1} years old" //Don't tell anyone!
            ;