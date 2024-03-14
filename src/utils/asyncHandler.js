const asyncHandler = (requestHandler) => {
   return (req, res, next) => 
        Promise.resolve(requestHandler(req, res, next)).
            catch((err) => next(err))
    
}

export { asyncHandler }

//syntax 2
// function asyncHandler(requestHandler){
//     return async function(req,res,next){
//         try {
//             return await requestHandler(req,res,next)
//         } catch (error) {
//             console.log('err:', error)
//         }
//     }
// }