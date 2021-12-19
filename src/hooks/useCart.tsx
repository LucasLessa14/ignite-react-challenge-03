import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const saveCart = (cart: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    setCart(cart);
  }

  const addProduct = async (productId: number) => {
    try {
      let response = null;
     
      response = await api.get(`/stock/${productId}`)
      const productStock = response.data

      const productIsAlreadyOnCart = cart.find(product => product.id === productId)

      if (productIsAlreadyOnCart) {
        const productAmountRequested = productIsAlreadyOnCart.amount + 1
        if (productAmountRequested > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque')
        }
        else {
          const updatedCart = cart.map(product => {
            if (product.id === productId) {
              return {
                ...product,
                amount: product.amount + 1
              }
            }
            return product
          })
          saveCart(updatedCart)
        }
      }
      else {
        response = await api.get(`/products/${productId}`)
        const productDetails = response.data
        const product = {
          ...productDetails,
          amount: 1
        }
        const updatedCart = [...cart, product]

        saveCart(updatedCart)
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductOnCart = cart.find(product => product.id === productId)
      if(isProductOnCart){
        const updatedCart = cart.filter(product => product.id !== productId)
        saveCart(updatedCart)
      }
      else{
        throw new Error("Produto não existe no carrinho");
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount > 1) {
        let response = await api.get(`/stock/${productId}`)
        const productStock = response.data

        const currentStockBalance = productStock.amount
        const hasNotEnoughStock =  amount > currentStockBalance
        if(hasNotEnoughStock){
          toast.error('Quantidade solicitada fora de estoque');
        }else{
          const isProductOnCart = cart.find(product => product.id === productId)
          if(isProductOnCart){
            const updatedCart = cart.map(product => {
              if(product.id === productId){
                return {...product, amount}
              }
              return product
            })
            saveCart(updatedCart)
          }
        }
      } else {
        throw new Error("Produto não existe no carrinho");
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
