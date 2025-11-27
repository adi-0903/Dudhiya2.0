import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getWalletTransactions } from '../services/api';
import { useTranslation } from 'react-i18next';

const PaymentHistoryScreen = () => {
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const PAGE_SIZE = 20;

  const { t, i18n } = useTranslation();

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('@selected_language');
        if (savedLanguage && i18n.language !== savedLanguage) {
          i18n.changeLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Error loading saved language:', error);
      }
    };
    
    loadSavedLanguage();
  }, [i18n]);

  const fetchTransactions = useCallback(async (pageNumber = 1, shouldRefresh = false) => {
    try {
      if (shouldRefresh) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const response = await getWalletTransactions({
        page: pageNumber,
        page_size: PAGE_SIZE
      });

      const newTransactions = response.results || [];
      
      if (shouldRefresh) {
        setTransactions(newTransactions);
      } else {
        setTransactions(prev => [...prev, ...newTransactions]);
      }

      // Check if there are more pages
      setHasMore(!!response.next);
      setPage(pageNumber);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(1, true);
  }, [fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions(1, true).finally(() => setRefreshing(false));
  }, [fetchTransactions]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !error) {
      fetchTransactions(page + 1);
    }
  }, [isLoadingMore, hasMore, page, error, fetchTransactions]);

  const getTransactionIcon = (type, status) => {
    if (status === 'FAILED') return 'close-circle';
    if (type === 'CREDIT') return 'arrow-down-circle';
    return 'arrow-up-circle';
  };

  const getTransactionColor = (type, status) => {
    if (status === 'FAILED') return '#FF4444';
    if (type === 'CREDIT') return '#4CAF50';
    return '#FF9800';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={[styles.transactionIconContainer, { backgroundColor: getTransactionColor(item.transaction_type, item.status) }]}>
        <Icon 
          name={getTransactionIcon(item.transaction_type, item.status)} 
          size={24} 
          color="#fff"
        />
      </View>
      
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>
          {item.description || (item.transaction_type === 'CREDIT' ? 'Money Added' : 'Money Deducted')}
        </Text>
        <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'SUCCESS' ? '#E8F5E9' : 
                            item.status === 'PENDING' ? '#FFF3E0' : '#FFEBEE' }
          ]}>
            <Text style={[
              styles.transactionStatus,
              { color: item.status === 'SUCCESS' ? '#2E7D32' : 
                      item.status === 'PENDING' ? '#EF6C00' : '#C62828' }
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.amountContainer}>
        <Text style={[
          styles.amount,
          { color: getTransactionColor(item.transaction_type, item.status) }
        ]}>
          {item.transaction_type === 'CREDIT' ? '+' : '-'} ₹{parseFloat(item.amount).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderError = () => {
    if (!error) return null;
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={24} color="#FF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchTransactions(page, true)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0D47A1" />
        <Text style={styles.loadingMoreText}>Loading more transactions...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payment history')}</Text>
      </View>

      <View style={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D47A1" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="cash-remove" size={80} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>{t('no transactions yet')}</Text>
            <Text style={styles.emptyText}>{t('your payment history will appear here')}</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListHeaderComponent={renderError}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0D47A1']}
                tintColor="#0D47A1"
              />
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#424242',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountContainer: {
    justifyContent: 'center',
    paddingLeft: 15,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#C62828',
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 8,
    color: '#757575',
    fontSize: 14,
  },
  loadingMoreText: {
    marginLeft: 8,
    color: '#757575',
    fontSize: 14,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
});

export default PaymentHistoryScreen; 
