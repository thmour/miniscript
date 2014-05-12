class List
	value, next
;

class Stack
	{
		args = arguments
		for args:0 instanceof Array ? args:0, args as arg
			@push(arg)
		;
		@head = stack ? stack.value, null
	}
	
	static
		max_size = 50
	
	public
		head
		size = 0
		push = # value {
			if @size < @@max_size
				stack = new List(value, stack)
				@size++
				@head = stack.value
			else
				throw new Error("Stack is full, can't push")
			;
		}
		pop = # {
			if @size > 0
				temp = stack.value
				stack = stack.next
				@size--
				@head = stack.value
				
				return temp
			else
				throw new Error("Stack is empty, can't pop")
			;
		}
		
	private
		stack
;

stack1 = new Stack(1,2,3,4)
stack2 = new Stack([0..49])

try
	stack2.push(10)
catch error
	print error.message
;

print stack1.head, stack2.head