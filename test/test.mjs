class List
	value, next
;

class Stack
	{
		for arg of arguments
			@push(arg)
		;
	}
	
	static
		max_size = 5
	
	public
		size = 0
		getHead = # {
			return stack.value
		}
		push = # value {
			if @size < @@max_size
				stack = new List(value, stack)
				@size++
			else
				throw new Error("Stack is full, can't push")
			;
		}
		pop = # {
			if @size > 0
				temp = stack.value
				stack = stack.next
				@size--
				
				return temp
			else
				throw new Error("Stack is empty, can't pop")
			;
		}
		
	private
		stack
;

stack = new Stack(1,2,3,4,5)

try
	stack.push(6)
catch error
	print error.message
;

print stack.getHead()